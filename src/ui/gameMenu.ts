/**
 * DOM game menu: save/load/export/import-save controls and the bring-your-own-files panel.
 * Handlers return a status string that is mirrored in an aria-live status line.
 */

export interface GameMenuHandlers {
  onSave(): string;
  onLoad(): string;
  onExport(): string;
  onImportSave(text: string): string;
  onExportRoster(): string;
  onImportRoster(text: string): string;
  onImportFiles(files: { dungeon: Uint8Array | null; graphics: Uint8Array | null }): Promise<string>;
}

export interface GameMenuController {
  setStatus(text: string): void;
  destroy(): void;
}

export function mountGameMenu(host: HTMLElement, handlers: GameMenuHandlers): GameMenuController {
  const bar = document.createElement('div');
  bar.id = 'game-menu';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Game menu');
  const status = document.createElement('div');
  status.id = 'game-menu-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const mk = (id: string, text: string, title: string, onClick: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.id = id; b.type = 'button'; b.textContent = text; b.title = title;
    b.addEventListener('click', onClick);
    bar.append(b);
    return b;
  };
  const say = (text: string): void => { status.textContent = text; };

  mk('save-btn', 'SAVE', 'Save to this browser (F5 in QoL mode)', () => say(handlers.onSave()));
  mk('load-btn', 'LOAD', 'Load the browser save (F9 in QoL mode)', () => say(handlers.onLoad()));
  mk('export-btn', 'EXPORT', 'Download the current game as a file', () => say(handlers.onExport()));

  const saveInput = document.createElement('input');
  saveInput.id = 'import-save-input'; saveInput.type = 'file'; saveInput.accept = '.json,application/json';
  saveInput.hidden = true;
  saveInput.addEventListener('change', () => {
    const file = saveInput.files?.[0];
    if (!file) return;
    void file.text().then((text) => say(handlers.onImportSave(text)), () => say('LOAD FAILED: FILE COULD NOT BE READ.'));
    saveInput.value = '';
  });
  mk('import-save-btn', 'OPEN SAVE', 'Load a previously exported save file', () => saveInput.click());

  mk('export-roster-btn', 'EXPORT ROSTER', 'Download your living champions to carry into a new game', () => say(handlers.onExportRoster()));
  const rosterInput = document.createElement('input');
  rosterInput.id = 'import-roster-input'; rosterInput.type = 'file'; rosterInput.accept = '.json,application/json';
  rosterInput.hidden = true;
  rosterInput.addEventListener('change', () => {
    const file = rosterInput.files?.[0];
    if (!file) return;
    void file.text().then((t) => say(handlers.onImportRoster(t)), () => say('ROSTER IMPORT FAILED: FILE COULD NOT BE READ.'));
    rosterInput.value = '';
  });
  mk('import-roster-btn', 'IMPORT ROSTER', 'Place exported champions at the Hall mirrors', () => rosterInput.click());

  const panel = document.createElement('aside');
  panel.id = 'import-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Import Dungeon Master files');
  const heading = document.createElement('strong');
  heading.textContent = 'IMPORT YOUR DUNGEON MASTER FILES';
  const note = document.createElement('p');
  note.textContent = 'Files are read in this browser only. Nothing is uploaded or stored by the app.';
  const field = (id: string, label: string): HTMLInputElement => {
    const l = document.createElement('label');
    l.textContent = `${label} `;
    const input = document.createElement('input');
    input.id = id; input.type = 'file';
    l.append(input);
    panel.append(l);
    return input;
  };
  panel.append(heading, note);
  const dungeonInput = field('import-dungeon-input', 'Dungeon.dat (required)');
  const graphicsInput = field('import-graphics-input', 'graphics.dat (optional)');
  const importStatus = document.createElement('div');
  importStatus.id = 'import-status';
  importStatus.setAttribute('role', 'status');
  importStatus.setAttribute('aria-live', 'polite');
  const go = document.createElement('button');
  go.id = 'import-go'; go.type = 'button'; go.textContent = 'START WITH THESE FILES';
  const close = document.createElement('button');
  close.id = 'import-close'; close.type = 'button'; close.textContent = 'CLOSE';
  close.addEventListener('click', () => { panel.hidden = true; });
  const readBytes = async (input: HTMLInputElement): Promise<Uint8Array | null> => {
    const file = input.files?.[0];
    return file ? new Uint8Array(await file.arrayBuffer()) : null;
  };
  go.addEventListener('click', () => {
    importStatus.textContent = 'READING FILES...';
    void (async () => {
      try {
        const message = await handlers.onImportFiles({
          dungeon: await readBytes(dungeonInput), graphics: await readBytes(graphicsInput)
        });
        importStatus.textContent = message;
        say(message);
      } catch {
        importStatus.textContent = 'IMPORT FAILED: FILE COULD NOT BE READ.';
      }
    })();
  });
  panel.append(go, close, importStatus);
  mk('import-files-btn', 'IMPORT FILES', 'Use your own Dungeon.dat / graphics.dat', () => { panel.hidden = !panel.hidden; });
  bar.append(status);
  host.append(bar, saveInput, rosterInput, panel);
  return {
    setStatus: say,
    destroy: () => { bar.remove(); saveInput.remove(); rosterInput.remove(); panel.remove(); }
  };
}
