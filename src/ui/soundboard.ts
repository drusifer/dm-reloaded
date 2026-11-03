/**
 * Interactive Amiga Paula PCM Soundboard & SFX Labeler overlay UI.
 *
 * TLDR:
 *   Lists all 33 extracted graphics.dat 8-bit signed PCM sound items (533..555 and 563..574)
 *   with mini oscilloscope waveforms, one-click auditioning (with adjustable Paula Hz & stereo
 *   pan), editable user labels persisted to localStorage, live SoundCueId routing (including
 *   assigning or silencing FOOTSTEP), and one-click JSON export.
 */

import { AMIGA_SOUND_ITEM_MAP, SYNTH_SOUND_ITEM } from '../audio';
import type { PaulaStereoAudio } from '../audio';
import type { DecodedSound, GraphicsBundle } from '../data/graphicsDatParser';
import type { SoundCueId } from '../engine/types';

export const SOUNDBOARD_STORAGE_KEY = 'dm_reloaded_soundboard_v1';

export const ALL_SOUND_CUES: readonly SoundCueId[] = [
  'WALL_BUMP',
  'SWITCH_CLICK',
  'DOOR_CLANK',
  'FOOTSTEP',
  'TELEPORT_BUZZ',
  'CHAMPION_REVIVE',
  'PIT_FALL',
  'ITEM_PICKUP',
  'THROW_SWOOSH',
  'GULP',
  'LOCK_CLICK',
  'CHAMPION_DEATH'
];

/**
 * FTL item[562] sound1772[22] table slot metadata for items 533..555.
 */
export const SOUND1772_SLOT_BY_ITEM: Readonly<Record<number, string>> = {
  533: 'SND[0]',
  534: 'SND[1]',
  535: 'SND[2]',
  536: 'SND[4]',
  537: 'SND[5/20]',
  539: 'SND[6]',
  540: 'SND[8]',
  541: 'SND[9]',
  542: 'SND[10]',
  543: 'SND[11]',
  544: 'SND[12]',
  545: 'SND[13]',
  546: 'SND[16]',
  547: 'SND[17]',
  549: 'SND[18]',
  550: 'SND[3]',
  551: 'SND[7]',
  552: 'SND[14]',
  553: 'SND[15]',
  554: 'SND[19]',
  555: 'SND[21]'
};

/**
 * Starter labels for known cues; unlabeled items remain blank for easy human ear cataloging.
 */
export const DEFAULT_SOUND_LABELS: Readonly<Record<number, string>> = {
  533: 'Metallic thud / armor hit?',
  534: 'Switch / button click',
  535: 'Door clank / portcullis rattle',
  536: 'Wooden thud / bash?',
  537: 'Fireball / explosion?',
  539: 'Party falling scream (pit)',
  540: 'Weapon swing / step?',
  541: 'Champion 1 hurt cry?',
  542: 'Champion 2 hurt cry?',
  543: 'Champion 3 hurt cry?',
  544: 'Champion 4 hurt cry?',
  545: 'War cry / Champion horn?',
  546: 'Slash / attack?',
  547: 'Teleporter / zap buzz?',
  549: 'Heavy impact / party hit?',
  550: 'Gulp / swallow?',
  551: 'Drink potion / water?',
  565: 'Party OOF! (wall bump)'
};

export interface SoundboardPreset {
  readonly version: 1;
  readonly sampleRateHz: number;
  readonly labels: Record<string, string>;
  readonly cueMap: Record<SoundCueId, number | null>;
}

export function createDefaultSoundboardPreset(): SoundboardPreset {
  const labels: Record<string, string> = {};
  for (const [k, v] of Object.entries(DEFAULT_SOUND_LABELS)) {
    labels[k] = v;
  }
  return {
    version: 1,
    sampleRateHz: 5500,
    labels,
    cueMap: { ...AMIGA_SOUND_ITEM_MAP }
  };
}

export function serializeSoundboardPreset(preset: SoundboardPreset): string {
  return JSON.stringify(preset, null, 2);
}

export function parseSoundboardPreset(rawJson: string): SoundboardPreset | null {
  try {
    const parsed = JSON.parse(rawJson) as Partial<SoundboardPreset>;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const base = createDefaultSoundboardPreset();
    const rate = typeof parsed.sampleRateHz === 'number'
      ? Math.max(3000, Math.min(22050, Math.round(parsed.sampleRateHz)))
      : base.sampleRateHz;

    const labels: Record<string, string> = { ...base.labels };
    if (parsed.labels && typeof parsed.labels === 'object') {
      for (const [k, v] of Object.entries(parsed.labels)) {
        if (typeof v === 'string') {
          labels[k] = v;
        }
      }
    }

    const cueMap: Record<SoundCueId, number | null> = { ...base.cueMap };
    if (parsed.cueMap && typeof parsed.cueMap === 'object') {
      for (const cue of ALL_SOUND_CUES) {
        const mapped = (parsed.cueMap as Record<string, unknown>)[cue];
        if (mapped === null || (typeof mapped === 'number' && Number.isInteger(mapped))) {
          cueMap[cue] = mapped;
        }
      }
    }

    return {
      version: 1,
      sampleRateHz: rate,
      labels,
      cueMap
    };
  } catch {
    return null;
  }
}

function drawWaveformPreview(canvas: HTMLCanvasElement, sound: DecodedSound): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#090c10';
  ctx.fillRect(0, 0, w, h);

  // Center zero-line
  ctx.fillStyle = '#1f2b38';
  ctx.fillRect(0, Math.floor(h / 2), w, 1);

  if (sound.samples.length === 0) {
    return;
  }

  ctx.fillStyle = '#38e27d';
  const step = sound.samples.length / w;
  for (let x = 0; x < w; x += 1) {
    const start = Math.floor(x * step);
    const end = Math.max(start + 1, Math.floor((x + 1) * step));
    let minVal = 1;
    let maxVal = -1;
    for (let i = start; i < end && i < sound.samples.length; i += 1) {
      const s = sound.samples[i] ?? 0;
      if (s < minVal) minVal = s;
      if (s > maxVal) maxVal = s;
    }
    const yTop = Math.max(0, Math.min(h - 1, Math.round(((1 - maxVal) * 0.5) * (h - 1))));
    const yBot = Math.max(yTop + 1, Math.min(h, Math.round(((1 - minVal) * 0.5) * (h - 1)) + 1));
    ctx.fillRect(x, yTop, 1, yBot - yTop);
  }
}

export interface SoundboardController {
  isOpen(): boolean;
  toggle(): void;
  close(): void;
  destroy(): void;
}

export function mountSoundboardUI(
  host: HTMLElement,
  audio: PaulaStereoAudio,
  graphics: GraphicsBundle
): SoundboardController {
  const savedRaw = typeof localStorage !== 'undefined' ? localStorage.getItem(SOUNDBOARD_STORAGE_KEY) : null;
  let preset = (savedRaw ? parseSoundboardPreset(savedRaw) : null) ?? createDefaultSoundboardPreset();
  let testPan = 0;
  let open = false;

  const applyPresetToAudio = (): void => {
    for (const cue of ALL_SOUND_CUES) {
      audio.setCueItem(cue, preset.cueMap[cue]);
    }
    audio.setPlaybackRateOverride(preset.sampleRateHz);
  };

  const persistPreset = (): void => {
    try {
      localStorage.setItem(SOUNDBOARD_STORAGE_KEY, serializeSoundboardPreset(preset));
    } catch {
      // Ignore storage quota errors
    }
  };

  applyPresetToAudio();

  // Floating toggle button in top-left corner
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'sfx-board-toggle';
  toggleBtn.type = 'button';
  toggleBtn.textContent = 'SFX BOARD [B]';
  toggleBtn.title = 'Open Amiga Paula Soundboard & SFX Labeler (Shortcut: B)';

  // Drawer panel
  const panel = document.createElement('aside');
  panel.id = 'sfx-board-panel';
  panel.hidden = true;

  const sortedSounds = Array.from(graphics.sounds.values()).sort((a, b) => a.index - b.index);

  const renderPanelContents = (): void => {
    panel.innerHTML = '';

    // 1. Header bar
    const header = document.createElement('div');
    header.className = 'sfx-header';

    const titleWrap = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = `PAULA 8-BIT SFX SOUNDLAB (${sortedSounds.length} SAMPLES)`;
    const subtitle = document.createElement('div');
    subtitle.className = 'sfx-sub';
    subtitle.textContent = 'Click ▶ to test, type labels (auto-saved), or route items to live game cues.';
    titleWrap.append(title, subtitle);

    const headerActions = document.createElement('div');
    headerActions.className = 'sfx-actions';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'sfx-btn sfx-btn-accent';
    copyBtn.textContent = 'Copy JSON';
    copyBtn.addEventListener('click', () => {
      const text = serializeSoundboardPreset(preset);
      if (navigator.clipboard) {
        void navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = 'Copied!';
          window.setTimeout(() => {
            copyBtn.textContent = 'Copy JSON';
          }, 1400);
        });
      }
    });

    const dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    dlBtn.className = 'sfx-btn';
    dlBtn.textContent = 'Download JSON';
    dlBtn.addEventListener('click', () => {
      const blob = new Blob([serializeSoundboardPreset(preset)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dm-soundboard-labels.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'sfx-btn';
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', () => {
      preset = createDefaultSoundboardPreset();
      applyPresetToAudio();
      persistPreset();
      renderPanelContents();
    });

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'sfx-btn';
    closeBtn.textContent = 'Close [Esc]';
    closeBtn.addEventListener('click', () => {
      setOpen(false);
    });

    headerActions.append(copyBtn, dlBtn, resetBtn, closeBtn);
    header.append(titleWrap, headerActions);

    // 2. Paula Rate & Pan Controls
    const controlsBar = document.createElement('div');
    controlsBar.className = 'sfx-controls-bar';

    const rateLabel = document.createElement('label');
    rateLabel.className = 'sfx-inline-control';
    const rateSpan = document.createElement('span');
    rateSpan.textContent = `Paula Sample Rate: ${preset.sampleRateHz} Hz`;
    const rateInput = document.createElement('input');
    rateInput.type = 'range';
    rateInput.min = '3500';
    rateInput.max = '11000';
    rateInput.step = '50';
    rateInput.value = String(preset.sampleRateHz);
    rateInput.addEventListener('input', () => {
      const nextHz = Number(rateInput.value);
      preset = { ...preset, sampleRateHz: nextHz };
      rateSpan.textContent = `Paula Sample Rate: ${nextHz} Hz`;
      audio.setPlaybackRateOverride(nextHz);
      persistPreset();
    });

    const rate5500Btn = document.createElement('button');
    rate5500Btn.type = 'button';
    rate5500Btn.className = 'sfx-btn-mini';
    rate5500Btn.textContent = '5500 Hz';
    rate5500Btn.addEventListener('click', () => {
      preset = { ...preset, sampleRateHz: 5500 };
      rateInput.value = '5500';
      rateSpan.textContent = 'Paula Sample Rate: 5500 Hz';
      audio.setPlaybackRateOverride(5500);
      persistPreset();
    });
    rateLabel.append(rateSpan, rateInput, rate5500Btn);

    const panWrap = document.createElement('div');
    panWrap.className = 'sfx-inline-control';
    const panTitle = document.createElement('span');
    panTitle.textContent = 'Test Pan:';
    panWrap.append(panTitle);
    for (const opt of [
      { label: 'L', pan: -0.8 },
      { label: 'C', pan: 0 },
      { label: 'R', pan: 0.8 }
    ]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `sfx-btn-mini${testPan === opt.pan ? ' active' : ''}`;
      b.textContent = opt.label;
      b.addEventListener('click', () => {
        testPan = opt.pan;
        renderPanelContents();
      });
      panWrap.append(b);
    }

    controlsBar.append(rateLabel, panWrap);

    // 3. Live Game Cue Assignment Bar
    const cueGrid = document.createElement('div');
    cueGrid.className = 'sfx-cue-grid';

    for (const cue of ALL_SOUND_CUES) {
      const chip = document.createElement('div');
      chip.className = 'sfx-cue-chip';

      const cueName = document.createElement('span');
      cueName.className = 'sfx-cue-name';
      cueName.textContent = cue;

      const select = document.createElement('select');
      select.className = 'sfx-select';
      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = 'NONE (Silent)';
      select.append(noneOpt);
      const synthOpt=document.createElement('option');
      synthOpt.value=String(SYNTH_SOUND_ITEM);
      synthOpt.textContent='SYNTHESIZED';
      select.append(synthOpt);

      for (const s of sortedSounds) {
        const opt = document.createElement('option');
        opt.value = String(s.index);
        const lbl = preset.labels[String(s.index)];
        opt.textContent = lbl ? `[${s.index}] ${lbl.slice(0, 22)}` : `item[${s.index}]`;
        select.append(opt);
      }
      select.value = preset.cueMap[cue] !== null ? String(preset.cueMap[cue]) : '';

      select.addEventListener('change', () => {
        const nextItem = select.value === '' ? null : Number(select.value);
        preset = {
          ...preset,
          cueMap: { ...preset.cueMap, [cue]: nextItem }
        };
        audio.setCueItem(cue, nextItem);
        persistPreset();
        renderPanelContents();
      });

      const testCueBtn = document.createElement('button');
      testCueBtn.type = 'button';
      testCueBtn.className = 'sfx-btn-mini';
      testCueBtn.textContent = '▶';
      testCueBtn.title = `Test ${cue}`;
      testCueBtn.disabled = preset.cueMap[cue] === null;
      testCueBtn.addEventListener('click', () => {
        const itemId = preset.cueMap[cue];
        if (itemId !== null) {
          if (itemId===SYNTH_SOUND_ITEM) audio.playCue(cue,0,0,0,{level:0,x:0,y:0,facing:0});
          else audio.playRawSoundItem(itemId, { pan: testPan, sampleRateHz: preset.sampleRateHz });
        }
      });

      chip.append(cueName, select, testCueBtn);
      cueGrid.append(chip);
    }

    // 4. All 33 graphics.dat Sound Item Rows
    const list = document.createElement('div');
    list.className = 'sfx-list';

    if (sortedSounds.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'sfx-empty';
      empty.textContent = 'Clean-Room mode active (no extracted graphics.dat PCM items found).';
      list.append(empty);
    }

    for (const snd of sortedSounds) {
      const row = document.createElement('div');
      row.className = 'sfx-row';

      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'sfx-play-btn';
      playBtn.textContent = `▶ ${snd.index}`;
      playBtn.addEventListener('click', () => {
        audio.playRawSoundItem(snd.index, { pan: testPan, sampleRateHz: preset.sampleRateHz });
      });

      const meta = document.createElement('div');
      meta.className = 'sfx-meta';
      const durMs = Math.round((snd.samples.length / preset.sampleRateHz) * 1000);
      const slotTag = SOUND1772_SLOT_BY_ITEM[snd.index] ?? 'EXTRA';
      meta.innerHTML = `<span class="sfx-slot">${slotTag}</span><span>${snd.samples.length} smp · ${durMs}ms</span>`;

      const wave = document.createElement('canvas');
      wave.width = 104;
      wave.height = 26;
      wave.className = 'sfx-wave';
      wave.title = 'Click waveform to audition';
      drawWaveformPreview(wave, snd);
      wave.addEventListener('click', () => {
        audio.playRawSoundItem(snd.index, { pan: testPan, sampleRateHz: preset.sampleRateHz });
      });

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.className = 'sfx-label-input';
      labelInput.placeholder = `Label item[${snd.index}] (e.g. Skeleton step, Door, Switch)...`;
      labelInput.value = preset.labels[String(snd.index)] ?? '';
      labelInput.addEventListener('input', () => {
        preset = {
          ...preset,
          labels: {
            ...preset.labels,
            [String(snd.index)]: labelInput.value
          }
        };
        persistPreset();
      });

      // Active cue badges + quick assign
      const assignSelect = document.createElement('select');
      assignSelect.className = 'sfx-select sfx-assign';
      const promptOpt = document.createElement('option');
      promptOpt.value = '';
      const mappedCues = ALL_SOUND_CUES.filter((c) => preset.cueMap[c] === snd.index);
      promptOpt.textContent = mappedCues.length > 0 ? `Mapped: ${mappedCues.join(', ')}` : 'Assign cue…';
      assignSelect.append(promptOpt);
      for (const cue of ALL_SOUND_CUES) {
        const opt = document.createElement('option');
        opt.value = cue;
        opt.textContent = `Set as ${cue}`;
        assignSelect.append(opt);
      }
      assignSelect.addEventListener('change', () => {
        const chosenCue = assignSelect.value as SoundCueId | '';
        if (chosenCue) {
          preset = {
            ...preset,
            cueMap: { ...preset.cueMap, [chosenCue]: snd.index }
          };
          audio.setCueItem(chosenCue, snd.index);
          persistPreset();
          renderPanelContents();
        }
      });

      row.append(playBtn, meta, wave, labelInput, assignSelect);
      list.append(row);
    }

    panel.append(header, controlsBar, cueGrid, list);
  };

  const setOpen = (nextOpen: boolean): void => {
    open = nextOpen;
    panel.hidden = !open;
    toggleBtn.classList.toggle('open', open);
    if (open) {
      renderPanelContents();
    }
  };

  toggleBtn.addEventListener('click', () => {
    audio.unlockFromGesture();
    setOpen(!open);
  });

  host.append(toggleBtn, panel);

  return {
    isOpen: () => open,
    toggle: () => setOpen(!open),
    close: () => setOpen(false),
    destroy: () => {
      toggleBtn.remove();
      panel.remove();
    }
  };
}
