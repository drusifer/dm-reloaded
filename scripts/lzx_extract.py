#!/usr/bin/env python3
"""
Amiga LZX archive extractor with full CRC verification (header CRC and per-file data CRC).

TLDR:
    python3 scripts/lzx_extract.py ARCHIVE.LZX OUTDIR   -> extracts every file, verifying CRC32s.
    python3 scripts/lzx_extract.py ARCHIVE.LZX --list   -> lists entries without extracting.
    Exit code is non-zero if any entry fails verification; failed entries are never written.

Format notes come from the public descriptions in libxmp's lzx.c / lzx_unpack.c (MIT) and the unlzx.c
comments they cite; this file is an independent Python implementation, validated by the CRCs stored in
the archive itself. Method 0 = stored, 2 = packed. Merged entries (flag 1) share one compressed stream
that is attached to the last entry of the group.
"""
from __future__ import annotations

import os
import struct
import sys
import zlib

HEADER_SIZE = 10
ENTRY_SIZE = 31
FLAG_MERGED = 1
NUM_CHARS = 256
MAX_CODES = NUM_CHARS + 512

SLOT_BASE = [0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1536,
             2048, 3072, 4096, 6144, 8192, 12288, 16384, 24576, 32768, 49152]
SLOT_BITS = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14]


LOOKUP_BITS = 12
LOOKUP_SIZE = 1 << LOOKUP_BITS
REVERSE8 = [int(format(i, '08b')[::-1], 2) for i in range(256)]


def _reverse(code: int, length: int) -> int:
    return int(format(code, f'0{length}b')[::-1], 2)


class LzxError(Exception):
    pass


class BitReader:
    """LSB-first bit buffer fed with 16-bit big-endian words (Amiga LZX)."""

    def __init__(self, data: bytes) -> None:
        self.data = data
        self.pos = 0
        self.buf = 0
        self.left = 0

    def _fill(self, need: int) -> None:
        while self.left < need and self.pos + 2 <= len(self.data):
            self.buf |= ((self.data[self.pos] << 8) | self.data[self.pos + 1]) << self.left
            self.left += 16
            self.pos += 2

    def peek(self, n: int) -> int:
        self._fill(n)
        return self.buf & ((1 << n) - 1)

    def skip(self, n: int) -> None:
        if self.left < n:
            raise LzxError('unexpected end of compressed data')
        self.buf >>= n
        self.left -= n

    def get(self, n: int) -> int:
        if n == 0:
            return 0
        v = self.peek(n)
        self.skip(n)
        return v


class Huffman:
    """Canonical Huffman decoder for LSB-ordered streams, built from code widths."""

    def __init__(self, widths: list[int], max_bits: int) -> None:
        counts = [0] * (max_bits + 1)
        for w in widths:
            counts[w] += 1
        counts[0] = 0
        first = 0
        offsets = [0] * (max_bits + 2)
        pos = 0
        self.bins: list[tuple[int, int, int]] = [(0, 0, 0)] * (max_bits + 1)
        for length in range(1, max_bits + 1):
            offsets[length] = pos
            pos += counts[length]
            self.bins[length] = (first - offsets[length], pos, counts[length])
            first = (first + counts[length]) << 1
        if first != 1 << (max_bits + 1):
            raise LzxError('huffman tree is over- or under-specified')
        self.values = [0] * pos
        cursor = offsets[:]
        for sym, w in enumerate(widths):
            if w:
                self.values[cursor[w]] = sym
                cursor[w] += 1
        self.max_bits = max_bits
        # 12-bit lookup for the common short codes; longer codes use the canonical slow path.
        self.lookup: list[tuple[int, int] | None] = [None] * LOOKUP_SIZE
        for length in range(1, min(max_bits, LOOKUP_BITS) + 1):
            offset, last, count = self.bins[length]
            for index in range(last - count, last):
                code = index + offset
                reversed_code = _reverse(code, length)
                for fill in range(reversed_code, LOOKUP_SIZE, 1 << length):
                    self.lookup[fill] = (self.values[index], length)

    def decode(self, br: BitReader) -> int:
        peek = br.peek(16)
        hit = self.lookup[peek & (LOOKUP_SIZE - 1)]
        if hit is not None:
            br.skip(hit[1])
            return hit[0]
        # reverse the 16 bit window so canonical MSB-first comparison works
        rev = (REVERSE8[peek & 0xFF] << 8) | REVERSE8[peek >> 8]
        for length in range(1, self.max_bits + 1):
            code = (rev >> (16 - length)) - self.bins[length][0]
            if self.bins[length][2] and 0 <= code < self.bins[length][1]:
                br.skip(length)
                return self.values[code]
        raise LzxError('invalid huffman code')


def _read_delta(br: BitReader, widths: list[int], start: int, end: int) -> None:
    pre_widths = [br.get(4) for _ in range(20)]
    pre = Huffman(pre_widths, 15)
    dists = start >= NUM_CHARS
    i = start
    while i < end:
        w = pre.decode(br)
        if w <= 16:
            widths[i] = (widths[i] + 17 - w) % 17
            i += 1
        elif w == 17:
            num = br.get(4) + 4 - dists
            if num > end - i:
                raise LzxError('run past end')
            widths[i:i + num] = [0] * num
            i += num
        elif w == 18:
            num = br.get(5 + dists) + 20 - dists
            if num > end - i:
                raise LzxError('run past end')
            widths[i:i + num] = [0] * num
            i += num
        elif w == 19:
            num = br.get(1) + 4 - dists
            if num > end - i:
                raise LzxError('run past end')
            z = pre.decode(br)
            if z > 16:
                raise LzxError('bad run symbol')
            value = (widths[i] + 17 - z) % 17
            widths[i:i + num] = [value] * num
            i += num
        else:
            raise LzxError('bad pretree symbol')


def unpack(src: bytes, out_len: int) -> bytes:
    br = BitReader(src)
    out = bytearray()
    widths = [0] * MAX_CODES
    prev_distance = 1
    while len(out) < out_len:
        block = br.get(3)
        if block not in (1, 2, 3):
            raise LzxError(f'bad block type {block}')
        aligned = None
        if block == 3:
            aligned = Huffman([br.get(3) for _ in range(8)], 7)
        count = (br.get(8) << 16) | (br.get(8) << 8) | br.get(8)
        if count > out_len - len(out):
            raise LzxError('block longer than output')
        codes = None
        if block in (2, 3):
            _read_delta(br, widths, 0, NUM_CHARS)
            _read_delta(br, widths, NUM_CHARS, MAX_CODES)
            codes = Huffman(widths, 16)
        if codes is None:
            raise LzxError('block type 1 (no tree) is not supported')
        while count:
            code = codes.decode(br)
            if code < NUM_CHARS:
                out.append(code)
                count -= 1
                continue
            slot = (code - NUM_CHARS) & 0x1F
            distance = SLOT_BASE[slot]
            bits = SLOT_BITS[slot]
            if bits:
                if block == 3 and bits >= 3:
                    distance += br.get(bits - 3) << 3
                    distance += aligned.decode(br)  # type: ignore[union-attr]
                else:
                    distance += br.get(bits)
            elif not distance:
                distance = prev_distance
            prev_distance = distance
            lslot = (code - NUM_CHARS) >> 5
            length = SLOT_BASE[lslot] + 3
            if SLOT_BITS[lslot]:
                length += br.get(SLOT_BITS[lslot])
            if length > count:
                raise LzxError('match longer than block')
            if distance > len(out):
                for _ in range(length):
                    out.append(out[-distance] if distance <= len(out) else 0)
            elif distance >= length:
                start = len(out) - distance
                out += out[start:start + length]
            else:
                for _ in range(length):
                    out.append(out[-distance])
            count -= length
    return bytes(out)


def parse_entries(data: bytes):
    if data[:3] != b'LZX':
        raise LzxError('not an LZX archive')
    pos = HEADER_SIZE
    entries = []
    while pos + ENTRY_SIZE <= len(data):
        h = bytearray(data[pos:pos + ENTRY_SIZE])
        un, pk = struct.unpack('<II', h[2:10])
        method, flags, clen = h[11], h[12], h[14]
        crc, hcrc = struct.unpack('<II', h[22:30])
        nlen = h[30]
        name = bytes(data[pos + ENTRY_SIZE:pos + ENTRY_SIZE + nlen]).decode('latin1')
        comment = data[pos + ENTRY_SIZE + nlen:pos + ENTRY_SIZE + nlen + clen]
        h[26:30] = b'\0\0\0\0'
        computed = zlib.crc32(comment, zlib.crc32(name.encode('latin1'), zlib.crc32(bytes(h)))) & 0xFFFFFFFF
        data_at = pos + ENTRY_SIZE + nlen + clen
        entries.append({'name': name, 'size': un, 'packed': pk, 'method': method, 'flags': flags,
                        'crc': crc, 'header_ok': computed == hcrc, 'data_at': data_at})
        pos = data_at + pk
    return entries, pos


def extract(data: bytes):
    """Yield (entry, content_or_None, error_or_None) for every entry."""
    entries, _ = parse_entries(data)
    group: list[dict] = []
    for e in entries:
        if not e['header_ok']:
            yield e, None, 'header CRC mismatch'
            group = []
            continue
        if e['flags'] & FLAG_MERGED:
            group.append(e)
            if not e['packed']:
                continue
            members = group
            group = []
        else:
            members = [e]
        total = sum(m['size'] for m in members)
        raw = data[e['data_at']:e['data_at'] + e['packed']]
        try:
            if e['method'] == 0:
                blob = raw
            elif e['method'] == 2:
                blob = unpack(raw, total)
            else:
                raise LzxError(f"unsupported method {e['method']}")
        except LzxError as exc:
            for m in members:
                yield m, None, str(exc)
            continue
        offset = 0
        for m in members:
            piece = blob[offset:offset + m['size']]
            offset += m['size']
            if zlib.crc32(piece) & 0xFFFFFFFF != m['crc']:
                yield m, None, 'data CRC mismatch'
            else:
                yield m, piece, None


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print(__doc__)
        return 2
    data = open(argv[1], 'rb').read()
    listing = argv[2] == '--list'
    bad = 0
    for entry, content, error in extract(data):
        if error:
            bad += 1
            print(f"FAIL {entry['name']}: {error}")
            continue
        status = 'ok'
        if not listing:
            target = os.path.join(argv[2], entry['name'])
            if os.path.isabs(entry['name']) or '..' in entry['name'].split('/'):
                print(f"FAIL {entry['name']}: unsafe path")
                bad += 1
                continue
            os.makedirs(os.path.dirname(target) or '.', exist_ok=True)
            with open(target, 'wb') as f:
                f.write(content)
            status = 'written'
        print(f"{status:7} {entry['name']} {entry['size']} bytes crc={entry['crc']:08x}")
    print(f"done: {bad} failure(s)")
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
