"""
Extracts original FTL Amiga Dungeon Master and Dungeon Master II assets from local zip/ADF archives.

TLDR:
    Unpacks AmigaDOS OFS (DOS\\x00) floppy images inside Dungeon-Master_Amiga_EN.zip and
    Dungeon-Master-II-Skullkeep_Amiga_EN.zip into gitignored public/assets/extracted/.
    Key functions: parse_ofs_directory, extract_ofs_file, decompress_dungeon_8104,
    extract_dm1_archive, extract_dm2_archive, main.
    Consumed by Makefile setup / extract-assets targets and runtime asset loaders.

Author: Neo
------------------------------------------------------------------------------
License: GPL-3.0
"""

from __future__ import annotations

import io
import json
import struct
import zipfile
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT_DIR / "public" / "assets" / "extracted"
DM1_ZIP = ROOT_DIR / "Dungeon-Master_Amiga_EN.zip"
DM2_ZIP = ROOT_DIR / "Dungeon-Master-II-Skullkeep_Amiga_EN.zip"


def _read_bstr(buf: bytes, offset: int) -> str:
    length = buf[offset]
    return buf[offset + 1 : offset + 1 + length].decode("latin1", errors="replace")


def parse_ofs_directory(adf: bytes, dir_block: int = 880, prefix: str = "") -> dict[str, int]:
    """Walk an AmigaDOS OFS directory tree and map lowercase virtual paths to header block numbers."""
    entries: dict[str, int] = {}
    total_blocks = len(adf) // 512
    blk = adf[dir_block * 512 : (dir_block + 1) * 512]
    for idx in range(6, 78):
        cur = struct.unpack_from(">I", blk, idx * 4)[0]
        while 0 < cur < total_blocks:
            eb = adf[cur * 512 : (cur + 1) * 512]
            sec_type = struct.unpack_from(">i", eb, 508)[0]
            name = _read_bstr(eb, 432)
            full_path = f"{prefix}/{name}"
            if sec_type == 2:
                entries.update(parse_ofs_directory(adf, cur, full_path))
            elif sec_type == -3:
                entries[full_path.lower()] = cur
            cur = struct.unpack_from(">I", eb, 496)[0]
    return entries


def extract_ofs_file(adf: bytes, header_block: int) -> bytes:
    """Extract a file payload from an AmigaDOS OFS (DOS\\x00) sector chain."""
    file_size = struct.unpack_from(">I", adf, header_block * 512 + 324)[0]
    out = bytearray()
    cur = header_block
    while cur != 0 and len(out) < file_size:
        blk = adf[cur * 512 : (cur + 1) * 512]
        high_seq = struct.unpack_from(">I", blk, 8)[0]
        for idx in range(71, 71 - high_seq, -1):
            data_blk_num = struct.unpack_from(">I", blk, 24 + idx * 4)[0]
            data_blk = adf[data_blk_num * 512 : (data_blk_num + 1) * 512]
            data_size = struct.unpack_from(">I", data_blk, 12)[0]
            out.extend(data_blk[24 : 24 + data_size])
            if len(out) >= file_size:
                break
        cur = struct.unpack_from(">I", blk, 504)[0]
    return bytes(out[:file_size])


def decompress_dungeon_8104(raw: bytes) -> bytes:
    """Decompress an FTL 0x8104 prefix-coded Dungeon.dat payload into raw Big-Endian Dungeon.dat bytes."""
    sig, uncomp_size, _dungeon_id = struct.unpack_from(">HIH", raw, 0)
    if sig != 0x8104:
        return raw
    top4 = raw[8:12]
    next16 = raw[12:28]
    stream = raw[28:]
    bit_pos = 0

    def read_bits(count: int) -> int:
        nonlocal bit_pos
        val = 0
        for _ in range(count):
            byte_val = stream[bit_pos >> 3]
            bit_idx = 7 - (bit_pos & 7)
            val = (val << 1) | ((byte_val >> bit_idx) & 1)
            bit_pos += 1
        return val

    out = bytearray()
    while len(out) < uncomp_size:
        if read_bits(1) == 0:
            out.append(top4[read_bits(2)])
        elif read_bits(1) == 0:
            out.append(next16[read_bits(4)])
        else:
            out.append(read_bits(8))
    return bytes(out)


def extract_dm1_archive(zip_path: Path, dest_dir: Path) -> dict[str, Any]:
    """Extract Dungeon.dat, decompressed Dungeon.decomp.dat, graphics.dat, and DMGame.dat from DM1 zip."""
    dm1_dir = dest_dir / "dm1"
    dm1_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as outer:
        inner_name = next(n for n in outer.namelist() if n.lower().endswith(".zip"))
        with zipfile.ZipFile(io.BytesIO(outer.read(inner_name))) as inner:
            adf_name = next(n for n in inner.namelist() if n.lower().endswith(".adf"))
            adf = inner.read(adf_name)

    files = parse_ofs_directory(adf)
    dungeon_raw = extract_ofs_file(adf, files["/dm/dungeon.dat"])
    dungeon_decomp = decompress_dungeon_8104(dungeon_raw)
    graphics_raw = extract_ofs_file(adf, files["/dm/graphics.dat"])

    (dm1_dir / "Dungeon.dat").write_bytes(dungeon_raw)
    (dm1_dir / "Dungeon.decomp.dat").write_bytes(dungeon_decomp)
    (dm1_dir / "graphics.dat").write_bytes(graphics_raw)

    result: dict[str, Any] = {
        "present": True,
        "dungeonRawBytes": len(dungeon_raw),
        "dungeonDecompBytes": len(dungeon_decomp),
        "graphicsBytes": len(graphics_raw),
        "graphicsItemCount": struct.unpack_from(">H", graphics_raw, 0)[0],
    }
    if "/dm/dmgame.dat" in files:
        save_raw = extract_ofs_file(adf, files["/dm/dmgame.dat"])
        (dm1_dir / "DMGame.dat").write_bytes(save_raw)
        result["sampleSaveBytes"] = len(save_raw)
    return result


def extract_dm2_archive(zip_path: Path, dest_dir: Path) -> dict[str, Any]:
    """Join /dm2_arcsplit1..6 across the 6 DM2 AGA install floppies into DM2_archive.LZX."""
    dm2_dir = dest_dir / "dm2"
    dm2_dir.mkdir(parents=True, exist_ok=True)
    joined = bytearray()
    with zipfile.ZipFile(zip_path) as outer:
        for disk_num in range(1, 7):
            target_prefix = f"Dungeon Master II - The Legend Of Skullkeep (1994)(Interplay)(AGA)(M3)(Disk {disk_num} of 6)[HD].zip"
            with zipfile.ZipFile(io.BytesIO(outer.read(target_prefix))) as inner:
                adf = inner.read(inner.namelist()[0])
                files = parse_ofs_directory(adf)
                split_key = f"/dm2_arcsplit{disk_num}"
                joined.extend(extract_ofs_file(adf, files[split_key]))

    out_lzx = dm2_dir / "DM2_archive.LZX"
    out_lzx.write_bytes(joined)
    return {
        "present": True,
        "joinedLzxBytes": len(joined),
        "archivePath": "dm2/DM2_archive.LZX",
    }


def main() -> None:
    """Entry point invoked by Makefile setup and extract-assets targets."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, Any] = {"dm1": {"present": False}, "dm2": {"present": False}}

    if DM1_ZIP.exists():
        manifest["dm1"] = extract_dm1_archive(DM1_ZIP, OUT_DIR)
        print(
            f"[extract_assets] DM1 extracted: Dungeon.decomp.dat={manifest['dm1']['dungeonDecompBytes']}B, "
            f"graphics.dat={manifest['dm1']['graphicsBytes']}B ({manifest['dm1']['graphicsItemCount']} items)"
        )
    else:
        print("[extract_assets] Dungeon-Master_Amiga_EN.zip not found; skipping DM1 binary extraction.")

    if DM2_ZIP.exists():
        manifest["dm2"] = extract_dm2_archive(DM2_ZIP, OUT_DIR)
        print(f"[extract_assets] DM2 joined archive: DM2_archive.LZX={manifest['dm2']['joinedLzxBytes']}B")
    else:
        print("[extract_assets] Dungeon-Master-II-Skullkeep_Amiga_EN.zip not found; skipping DM2 extraction.")

    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
