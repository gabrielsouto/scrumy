const STORAGE_KEY = "scrumy.board.v1"; // legacy single-board key (for migration)
const THEME_STORAGE_KEY = "scrumy.theme.v1";
const BOARDS_META_KEY = "scrumy.boards.meta.v1";
const CURRENT_BOARD_KEY = "scrumy.current.boardId.v1";
const BOARD_STATE_PREFIX = "scrumy.board.v1."; // per-board state: scrumy.board.v1.<id>
const STATUSES = [
  { key: "story", label: "História" },
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "A Fazer" },
  { key: "doing", label: "Fazendo" },
  { key: "review", label: "Revisão" },
  { key: "done", label: "Concluído" }
];

let state = [];
let currentBoardId = null;
// lanes are stored per-board in meta as `lanes` (number)

function uid() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Try to read a board name from the URL.
// Supports:
//  - ?board=Nome
//  - ?quadro=Nome
//  - ?nome=Nome
//  - ?name=Nome
//  - ?Nome%20Direto (bare key without '=')
function getBoardNameFromURL() {
  try {
    const search = window.location.search || "";
    if (search && search !== "?") {
      const params = new URLSearchParams(search);
      const candidates = ["board", "quadro", "nome", "name"]; 
      for (const key of candidates) {
        const v = (params.get(key) || "").trim();
        if (v) return v;
      }
      // Fallback: handle bare query like ?Sprint%201
      // URLSearchParams will treat it as a key with empty value
      // e.g., entries(): [["Sprint 1", ""]]
      for (const [k, v] of params.entries()) {
        const name = (v || "").trim() || (k || "").trim();
        if (name) return name;
      }
      // As a last resort, try manual decode of the whole query sans '?'
      const raw = decodeURIComponent(search.replace(/^\?+/, "")).replace(/\+/g, " ").trim();
      if (raw) return raw;
    }

    // If current URL is exactly the app root directory, do not infer name from path
    const __basePath = new URL('.', document.URL).pathname.replace(/\\+/g, "/");
    const __fullPath = (window.location.pathname || "").replace(/\\+/g, "/");
    const __baseParts = __basePath.split("/").filter(Boolean);
    const __fullParts = __fullPath.split("/").filter(Boolean);
    if (__fullParts.length <= __baseParts.length) {
      return "";
    }

    // No query string; try to read the last non-file path segment
    const path = (window.location.pathname || "").replace(/\/+/g, "/");
    const parts = path.split("/").filter(Boolean);
    if (parts.length > 0) {
      let last = parts[parts.length - 1];
      // Ignore common file names
      if (last.toLowerCase() === "index.html") return "";
      // Ignore paths that look like files (contain a dot)
      if (last.includes(".")) return "";
      try { last = decodeURIComponent(last); } catch {}
      last = last.replace(/\+/g, " ").trim();
      if (last) return last;
    }
    return "";
  } catch {
    return "";
  }
}

// Determine how the current URL encodes the board name
// Returns: 'path' | 'query' | 'none'
function getBoardRoutingStyle() {
  try {
    const search = window.location.search || "";
    if (search && search !== "?") {
      const params = new URLSearchParams(search);
      const candidates = ["board", "quadro", "nome", "name"]; 
      for (const key of candidates) {
        const v = (params.get(key) || "").trim();
        if (v) return 'query';
      }
      // Bare query like ?Sprint%201
      for (const [k, v] of params.entries()) {
        const name = (v || "").trim() || (k || "").trim();
        if (name) return 'query';
      }
    }
    const basePath = new URL('.', document.URL).pathname.replace(/\\+/g, "/");
    const fullPath = (window.location.pathname || "").replace(/\\+/g, "/");
    const baseParts = basePath.split('/').filter(Boolean);
    const fullParts = fullPath.split('/').filter(Boolean);
    if (fullParts.length > baseParts.length) {
      const last = fullParts[fullParts.length - 1];
      if (last && last.toLowerCase() !== 'index.html' && !last.includes('.')) return 'path';
    }
    return 'none';
  } catch {
    return 'none';
  }
}

// Update the URL to reflect the current board name, preserving the existing routing style when possible
function updateBoardURLForCurrent() {
  try {
    if (!currentBoardId) return;
    const meta = loadBoardsMeta();
    const cur = meta.find((b) => b.id === currentBoardId);
    const name = (cur && cur.name) ? cur.name.trim() : '';
    if (!name) return;

    const style = getBoardRoutingStyle();
    const hash = window.location.hash || '';

    if (style === 'path') {
      const basePath = new URL('.', document.URL).pathname;
      const newPath = basePath.replace(/\\+/g, "/").replace(/\/?$/, '/') + encodeURIComponent(name);
      const newUrl = newPath + hash;
      if (window.location.pathname + window.location.hash !== newUrl) {
        history.replaceState(null, '', newUrl);
      }
      return;
    }

    // If current style is query, update ?board=...
    if (style === 'query') {
      const params = new URLSearchParams(window.location.search || '');
      // Normalize to 'board' param
      ['board','quadro','nome','name'].forEach(k => params.delete(k));
      params.set('board', name);
      const qs = '?' + params.toString();
      const newUrl = (window.location.pathname || '/') + qs + hash;
      if ((window.location.search || '') + (window.location.hash || '') !== qs + hash) {
        history.replaceState(null, '', newUrl);
      }
      return;
    }
    // style === 'none': keep root clean; do not modify URL
  } catch {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
}

function saveState() {
  if (!currentBoardId) return;
  localStorage.setItem(BOARD_STATE_PREFIX + currentBoardId, JSON.stringify(state));
  // update meta updatedAt
  try {
    const raw = localStorage.getItem(BOARDS_META_KEY);
    const meta = raw ? JSON.parse(raw) : [];
    if (Array.isArray(meta)) {
      const m = meta.find((b) => b.id === currentBoardId);
      if (m) m.updatedAt = Date.now();
      localStorage.setItem(BOARDS_META_KEY, JSON.stringify(meta));
    }
  } catch {}
}

// Theme management
function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  const btn = document.getElementById("themeToggleBtn");
  if (btn) {
    btn.textContent = theme === "dark" ? "Tema: Escuro" : "Tema: Claro";
    btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
  }
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {}
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
}

// Global helper to close any open header menus
function closeMenus() {
  document.querySelectorAll('.menu-item.open').forEach((item) => {
    item.classList.remove('open');
    const btn = item.querySelector('.menu-trigger');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
}

// Boards management helpers
function boardKey(id) { return BOARD_STATE_PREFIX + id; }

function loadBoardsMeta() {
  try {
    const raw = localStorage.getItem(BOARDS_META_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveBoardsMeta(meta) {
  localStorage.setItem(BOARDS_META_KEY, JSON.stringify(meta));
}

function getCurrentBoardId() {
  try { return localStorage.getItem(CURRENT_BOARD_KEY); } catch { return null; }
}

function setCurrentBoardId(id) {
  currentBoardId = id;
  try { localStorage.setItem(CURRENT_BOARD_KEY, id); } catch {}
  updateCurrentBoardName();
}

function getLanesCount() {
  const meta = loadBoardsMeta();
  const cur = meta.find((b) => b.id === currentBoardId);
  const lanes = cur && typeof cur.lanes === 'number' && cur.lanes > 0 ? cur.lanes : 1;
  return lanes;
}

function setLanesCount(n) {
  const meta = loadBoardsMeta();
  const cur = meta.find((b) => b.id === currentBoardId);
  if (!cur) return;
  const lanes = Math.max(1, Math.floor(n || 1));
  cur.lanes = lanes;
  cur.updatedAt = Date.now();
  // adjust story notes length to lanes
  if (!Array.isArray(cur.storyNotes)) cur.storyNotes = [];
  if (cur.storyNotes.length < lanes) {
    while (cur.storyNotes.length < lanes) cur.storyNotes.push("");
  } else if (cur.storyNotes.length > lanes) {
    cur.storyNotes = cur.storyNotes.slice(0, lanes);
  }
  saveBoardsMeta(meta);
}

// Show/Hide lane controls according to current lanes count
function updateLaneButtonsVisibility() {
  const btn = document.getElementById('removeLaneBtn');
  if (!btn) return;
  const lanes = getLanesCount();
  btn.style.display = (lanes <= 1) ? 'none' : '';
}

function getStoryNotes() {
  const meta = loadBoardsMeta();
  const cur = meta.find((b) => b.id === currentBoardId) || {};
  const lanes = getLanesCount();
  let notes = Array.isArray(cur.storyNotes) ? cur.storyNotes.slice() : [];
  if (notes.length < lanes) {
    while (notes.length < lanes) notes.push("");
  } else if (notes.length > lanes) {
    notes = notes.slice(0, lanes);
  }
  return notes;
}

function setStoryNote(laneIndex, text) {
  const meta = loadBoardsMeta();
  const cur = meta.find((b) => b.id === currentBoardId);
  if (!cur) return;
  const lanes = getLanesCount();
  const idx = Math.max(0, Math.min(lanes - 1, Math.floor(laneIndex || 0)));
  if (!Array.isArray(cur.storyNotes)) cur.storyNotes = [];
  while (cur.storyNotes.length < lanes) cur.storyNotes.push("");
  cur.storyNotes[idx] = String(text || "");
  cur.updatedAt = Date.now();
  saveBoardsMeta(meta);
}

function setStoryNotes(allNotes) {
  const meta = loadBoardsMeta();
  const cur = meta.find((b) => b.id === currentBoardId);
  if (!cur) return;
  const lanes = getLanesCount();
  const incoming = Array.isArray(allNotes) ? allNotes : [];
  const sanitized = [];
  for (let i = 0; i < lanes; i++) sanitized.push(String(incoming[i] || ""));
  cur.storyNotes = sanitized;
  cur.updatedAt = Date.now();
  saveBoardsMeta(meta);
}

function loadStateForBoard(id) {
  try {
    const raw = localStorage.getItem(boardKey(id));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function updateCurrentBoardName() {
  const wrapper = document.getElementById('currentBoardName');
  if (!wrapper) return;
  const label = wrapper.querySelector('.board-name-label');
  const meta = loadBoardsMeta();
  const cur = meta.find((b) => b.id === currentBoardId);
  const name = cur && cur.name ? cur.name : '';
  if (label) label.textContent = name;
  wrapper.setAttribute('title', name ? `Renomear quadro: ${name}` : 'Renomear quadro');
}

function renameCurrentBoardInline() {
  if (!currentBoardId) return;
  const meta = loadBoardsMeta();
  const cur = meta.find((b) => b.id === currentBoardId);
  if (!cur) return;

  const wrapper = document.getElementById('currentBoardName');
  if (!wrapper) return;
  const label = wrapper.querySelector('.board-name-label');
  const icon = wrapper.querySelector('.edit-icon');

  const startName = (cur.name || '');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'board-name-input';
  input.value = startName;
  input.setAttribute('aria-label', 'Renomear quadro');

  // Hide label/icon while editing
  if (label) label.style.display = 'none';
  if (icon) icon.style.display = 'none';
  wrapper.appendChild(input);
  input.focus();
  input.select();

  function cleanup() {
    input.removeEventListener('keydown', onKeyDown);
    input.removeEventListener('blur', onBlur);
    input.remove();
    if (label) label.style.display = '';
    if (icon) icon.style.display = '';
  }

  function commit() {
    const newName = (input.value || '').trim();
    cleanup();
    if (!newName || newName === startName) {
      updateCurrentBoardName();
      return;
    }
    cur.name = newName;
    cur.updatedAt = Date.now();
    saveBoardsMeta(meta);
    refreshBoardSelect();
    updateCurrentBoardName();
    // Reflect renamed board in URL
    updateBoardURLForCurrent();
  }

  function cancel() {
    cleanup();
    updateCurrentBoardName();
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  }
  function onBlur() { commit(); }

  input.addEventListener('keydown', onKeyDown);
  input.addEventListener('blur', onBlur);
}

function findCard(id) {
  return state.find((c) => c.id === id);
}

function renderBoard() {
  const board = document.getElementById('board');
  if (!board) return;
  board.innerHTML = '';
  const lanes = getLanesCount();
  const notes = getStoryNotes();
  for (let laneIndex = 0; laneIndex < lanes; laneIndex++) {
    const laneEl = document.createElement('div');
    laneEl.className = 'lane';
    for (const status of STATUSES) {
      const section = document.createElement('section');
      section.className = 'column';
      section.setAttribute('aria-label', status.label);

      const h2 = document.createElement('h2');
      h2.textContent = status.label;
      section.appendChild(h2);

      if (status.key === 'story') {
        const wrap = document.createElement('div');
        wrap.className = 'story-notes';
        const editor = document.createElement('div');
        editor.className = 'story-editor';
        editor.setAttribute('contenteditable', 'true');
        editor.dataset.lane = String(laneIndex);
        editor.setAttribute('data-placeholder', 'Escreva a história desta linha...');
        editor.textContent = notes[laneIndex] || '';
        let saveTimer = null;
        const commit = () => {
          const text = editor.textContent || '';
          setStoryNote(laneIndex, text);
        };
        editor.addEventListener('input', () => {
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(commit, 400);
        });
        editor.addEventListener('blur', commit);
        wrap.appendChild(editor);
        section.appendChild(wrap);
      } else {
        const container = document.createElement('div');
        container.className = 'column-cards';
        container.dataset.status = status.key;
        container.dataset.lane = String(laneIndex);

        const cards = state.filter((c) => (c.status === status.key) && ((c.lane || 0) === laneIndex));
        for (const card of cards) {
          container.appendChild(renderCard(card));
        }

        section.appendChild(container);
      }
      laneEl.appendChild(section);
    }
    board.appendChild(laneEl);
  }
  setupDnD();
  updateLaneButtonsVisibility();
}

// Boards UI helpers and actions
function refreshBoardSelect() {
  const select = document.getElementById("boardSelect");
  if (!select) return;
  const meta = loadBoardsMeta();
  select.innerHTML = "";
  for (const b of meta) {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.name || b.id;
    if (b.id === currentBoardId) opt.selected = true;
    select.appendChild(opt);
  }
}

function createBoard(name, initialState = [], lanes = 1, storyNotes = null) {
  const meta = loadBoardsMeta();
  const id = "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const lanesNum = Math.max(1, Math.floor(lanes || 1));
  let notes = Array.isArray(storyNotes) ? storyNotes.slice(0, lanesNum) : [];
  while (notes.length < lanesNum) notes.push("");
  const boardMeta = { id, name: name || "Novo Quadro", createdAt: Date.now(), updatedAt: Date.now(), lanes: lanesNum, storyNotes: notes };
  meta.push(boardMeta);
  saveBoardsMeta(meta);
  localStorage.setItem(boardKey(id), JSON.stringify(initialState));
  setCurrentBoardId(id);
  state = initialState.slice();
  refreshBoardSelect();
  renderBoard();
  // Reflect created board in URL
  updateBoardURLForCurrent();
}

function deleteBoard(id) {
  const meta = loadBoardsMeta();
  const idx = meta.findIndex((b) => b.id === id);
  if (idx === -1) return;
  meta.splice(idx, 1);
  saveBoardsMeta(meta);
  try { localStorage.removeItem(boardKey(id)); } catch {}
  if (!meta.length) {
    createBoard("Quadro 1", []);
  } else {
    const next = meta[0].id;
    setCurrentBoardId(next);
    state = loadStateForBoard(next);
    refreshBoardSelect();
    renderBoard();
    // Reflect switched board in URL
    updateBoardURLForCurrent();
  }
}

function loadBoard(id) {
  setCurrentBoardId(id);
  state = loadStateForBoard(id);
  refreshBoardSelect();
  renderBoard();
  // Reflect selected board in URL
  updateBoardURLForCurrent();
}

function saveBoardAs(name) {
  const clone = state.map((c) => ({ ...c }));
  const lanes = getLanesCount();
  const notes = getStoryNotes();
  createBoard(name || "Cópia do Quadro", clone, lanes, notes);
}

function renderCard(card) {
  const el = document.createElement("article");
  el.className = "card";
  el.draggable = true;
  el.dataset.id = card.id;

  // Apply color modifier if present
  if (card && typeof card.color === 'string') {
    const c = card.color.trim().toLowerCase();
    if (c === 'yellow' || c === 'blue' || c === 'red' || c === 'green' || c === 'gray') {
      el.classList.add(`color-${c}`);
    }
  }

  const head = document.createElement("div");
  head.className = "card-head";

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = card.title || "(Sem título)";

  head.append(title);

  const desc = document.createElement("p");
  desc.className = "card-desc";
  desc.textContent = card.description || "";

  // Footer with observation/note if present
  let footer = null;
  const noteText = (card.observation || "").trim();
  if (noteText) {
    footer = document.createElement("div");
    footer.className = "card-footer";
    const note = document.createElement("p");
    note.className = "card-note";
    note.textContent = noteText;
    footer.appendChild(note);
  }

  // Close (delete) button in the top-right corner
  const closeBtn = document.createElement('button');
  closeBtn.className = 'card-close';
  closeBtn.title = 'Excluir';
  closeBtn.setAttribute('aria-label', 'Excluir');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const ok = confirm('Deseja excluir esta tarefa?');
    if (!ok) return;
    state = state.filter((c) => c.id !== card.id);
    saveState();
    renderBoard();
  });

  // Edit button in the top-right corner (left of close)
  const editBtnCorner = document.createElement('button');
  editBtnCorner.className = 'card-edit';
  editBtnCorner.title = 'Editar';
  editBtnCorner.setAttribute('aria-label', 'Editar');
  editBtnCorner.textContent = '✎';
  editBtnCorner.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal({ mode: 'edit', card });
  });

  if (footer) el.append(head, desc, footer, editBtnCorner, closeBtn);
  else el.append(head, desc, editBtnCorner, closeBtn);

  el.addEventListener("dragstart", (e) => {
    el.classList.add("dragging");
    e.dataTransfer.setData("text/plain", card.id);
    e.dataTransfer.effectAllowed = "move";
  });
  el.addEventListener("dragend", () => el.classList.remove("dragging"));

  return el;
}

function setupDnD() {
  document.querySelectorAll(".column-cards").forEach((col) => {
    col.addEventListener("dragover", (e) => {
      const isStory = col.dataset.status === 'story';
      if (isStory) {
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
        return; // do not allow drop over História
      }
      e.preventDefault();
      col.classList.add("drop-target");
      e.dataTransfer.dropEffect = "move";
    });
    col.addEventListener("dragleave", () => col.classList.remove("drop-target"));
    col.addEventListener("drop", (e) => {
      const isStory = col.dataset.status === 'story';
      if (isStory) return;
      e.preventDefault();
      col.classList.remove("drop-target");
      const id = e.dataTransfer.getData("text/plain");
      if (!id) return;
      const card = findCard(id);
      if (!card) return;
      const toStatus = col.dataset.status;
      const toLane = parseInt(col.dataset.lane || '0', 10) || 0;
      const samePlace = (card.status === toStatus) && ((card.lane || 0) === toLane);
      if (samePlace) return;
      card.status = toStatus;
      card.lane = toLane;
      saveState();
      renderBoard();
    });
  });
}

function openModal({ mode, card } = { mode: "create" }) {
  const modal = document.getElementById("modal");
  const titleEl = document.getElementById("modalTitle");
  const idEl = document.getElementById("cardId");
  const titleInput = document.getElementById("titleInput");
  const descInput = document.getElementById("descInput");
  const obsInput = document.getElementById("obsInput");
  const statusSelect = document.getElementById("statusSelect");
  const colorRadios = /** @type {NodeListOf<HTMLInputElement>} */(document.querySelectorAll('input[name="color"]'));

  if (mode === "edit" && card) {
    titleEl.textContent = "Editar Tarefa";
    idEl.value = card.id;
    titleInput.value = card.title || "";
    descInput.value = card.description || "";
    obsInput.value = card.observation || "";
    statusSelect.value = (card.status === 'story') ? 'backlog' : card.status;
    // Set color selection
    const currentColor = (card.color || '').toLowerCase();
    let found = false;
    colorRadios.forEach((r) => {
      const match = r.value === currentColor;
      r.checked = match;
      if (match) found = true;
    });
    if (!found) {
      // default selection for legacy cards without color
      const def = document.querySelector('input[name="color"][value="yellow"]');
      if (def) def.checked = true;
    }
  } else {
    titleEl.textContent = "Nova Tarefa";
    idEl.value = "";
    titleInput.value = "";
    descInput.value = "";
    obsInput.value = "";
    statusSelect.value = "backlog";
    // default color
    const def = document.querySelector('input[name="color"][value="yellow"]');
    if (def) def.checked = true;
  }

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  titleInput.focus();
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function bindUI() {
  // Menu toggles
  (function setupMenus() {
    const items = [
      { btnId: "menuBoardsBtn", panelId: "menuBoards" },
      { btnId: "menuTasksBtn", panelId: "menuTasks" },
      { btnId: "menuExportBtn", panelId: "menuExport" },
    ];
    const entries = items.map(({ btnId, panelId }) => {
      const btn = document.getElementById(btnId);
      const panel = document.getElementById(panelId);
      const container = btn ? btn.parentElement : null;
      return { btn, panel, container };
    }).filter(x => x.btn && x.panel && x.container);

    entries.forEach(({ btn, container }) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = container.classList.contains("open");
        closeMenus();
        if (!isOpen) {
          container.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });

    document.addEventListener("click", (e) => {
      // Do not close if the click happened inside the menu/nav
      if (e.target && e.target.closest && e.target.closest('.menu')) return;
      closeMenus();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenus(); });
  })();

  document.getElementById("addCardBtn").addEventListener("click", () => openModal());
  document.getElementById("cancelBtn").addEventListener("click", () => closeModal());
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") closeModal();
  });

  document.getElementById("clearBoardBtn").addEventListener("click", () => {
    const ok = confirm("Limpar todo o quadro? Esta ação não pode ser desfeita.");
    if (!ok) return;
    state = [];
    saveState();
    // Resetar as linhas para 1 ao limpar o quadro
    setLanesCount(1);
    renderBoard();
    // Fechar menus após ação de limpar
    if (typeof closeMenus === 'function') closeMenus();
  });

  const form = document.getElementById("cardForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("cardId").value.trim();
    const title = document.getElementById("titleInput").value.trim();
    const description = document.getElementById("descInput").value.trim();
    const observation = document.getElementById("obsInput").value.trim();
    let status = document.getElementById("statusSelect").value;
    const colorEl = /** @type {HTMLInputElement|null} */(document.querySelector('input[name="color"]:checked'));
    const color = colorEl ? colorEl.value : 'yellow';
    if (!title) return;
    if (status === 'story') status = 'backlog';

    if (id) {
      const existing = findCard(id);
      if (existing) {
        existing.title = title;
        existing.description = description;
        existing.observation = observation;
        existing.status = status;
        existing.color = color;
      }
    } else {
      state.push({ id: uid(), title, description, observation, status, color, lane: 0, createdAt: Date.now() });
    }

    saveState();
    renderBoard();
    closeModal();
  });

  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
  }

  const exportBtn = document.getElementById("exportImgBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportBoardImage);
  }

  const exportJsonBtn = document.getElementById("exportJsonBtn");
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener("click", exportBoardJson);
  }

  const importJsonBtn = document.getElementById("importJsonBtn");
  const importJsonInput = document.getElementById("importJsonInput");
  if (importJsonBtn && importJsonInput) {
    importJsonBtn.addEventListener("click", () => {
      // open file picker
      importJsonInput.value = "";
      importJsonInput.click();
    });
    importJsonInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) importBoardJsonFile(file);
    });
  }

  const boardSelect = document.getElementById("boardSelect");
  if (boardSelect) {
    boardSelect.addEventListener("change", (e) => {
      const targetId = e.target.value;
      if (targetId && targetId !== currentBoardId) {
        loadBoard(targetId);
      }
      // Fechar o menu após selecionar um quadro
      closeMenus();
    });
  }

  const newBoardBtn = document.getElementById("newBoardBtn");
  if (newBoardBtn) {
    newBoardBtn.addEventListener("click", () => {
      const name = prompt("Nome do novo quadro:", "Novo Quadro");
      if (name === null) return;
      createBoard(name.trim() || "Novo Quadro", [], 1);
      closeMenus();
    });
  }

  const saveBoardAsBtn = document.getElementById("saveBoardAsBtn");
  if (saveBoardAsBtn) {
    saveBoardAsBtn.addEventListener("click", () => {
      const name = prompt("Salvar quadro como:", "Cópia do Quadro");
      if (name === null) return;
      saveBoardAs(name.trim() || "Cópia do Quadro");
      closeMenus();
    });
  }

  const addLaneBtn = document.getElementById('addLaneBtn');
  if (addLaneBtn) {
    addLaneBtn.addEventListener('click', () => {
      const current = getLanesCount();
      setLanesCount(current + 1);
      renderBoard();
      closeMenus();
      try { document.getElementById('board').lastElementChild?.scrollIntoView({ behavior: 'smooth' }); } catch {}
    });
  }

  const removeLaneBtn = document.getElementById('removeLaneBtn');
  if (removeLaneBtn) {
    removeLaneBtn.addEventListener('click', () => {
      const count = getLanesCount();
      if (count <= 1) {
        alert('Já está na primeira linha.');
        return;
      }
      const lastIndex = count - 1;
      const hasCardsInLast = state.some((c) => (c.lane || 0) === lastIndex);
      if (hasCardsInLast) {
        const ok = confirm('A última linha possui tarefas. Elas serão movidas para a linha anterior. Continuar?');
        if (!ok) return;
      }
      // Move cards from last lane to previous lane
      state.forEach((c) => {
        const l = (c.lane || 0);
        if (l === lastIndex) c.lane = Math.max(0, lastIndex - 1);
        else if (l > lastIndex) c.lane = Math.max(0, lastIndex - 1);
      });
      saveState();
      setLanesCount(count - 1);
      renderBoard();
      closeMenus();
    });
  }

  const deleteBoardBtn = document.getElementById("deleteBoardBtn");
  if (deleteBoardBtn) {
    deleteBoardBtn.addEventListener("click", () => {
      if (!currentBoardId) return;
      const meta = loadBoardsMeta();
      const cur = meta.find((b) => b.id === currentBoardId);
      const label = (cur && cur.name) ? cur.name : "quadro";
      const ok = confirm(`Apagar "${label}"? Esta ação não pode ser desfeita.`);
    if (!ok) return;
    deleteBoard(currentBoardId);
    closeMenus();
  });
  }

  const boardNamePill = document.getElementById('currentBoardName');
  if (boardNamePill) {
    boardNamePill.addEventListener('click', renameCurrentBoardInline);
  }
  // Initial visibility for lane controls
  updateLaneButtonsVisibility();
}

function maybeSeed() {
  if (state.length) return;
  const samples = [
    { title: "Configurar repositório", description: "Criar projeto inicial", status: "backlog" },
    { title: "Especificar requisitos", description: "User stories principais", status: "todo" },
    { title: "Implementar autenticação", description: "Login com e-mail", status: "doing" },
    { title: "Revisar UI", description: "Ajustar responsividade", status: "review" },
    { title: "Pipeline CI", description: "Build + testes", status: "done" }
  ];
  state = samples.map((s) => ({ id: uid(), createdAt: Date.now(), ...s }));
  saveState();
}

function init() {
  // Theme first to avoid FOUC between dark/light
  applyTheme(getInitialTheme());

  // If a name is provided via URL, create/select that board immediately
  const requestedName = getBoardNameFromURL();
  if (requestedName) {
    const metaNow = loadBoardsMeta();
    const existing = metaNow.find((b) => (b.name || "").toLowerCase() === requestedName.toLowerCase());
    if (existing) {
      setCurrentBoardId(existing.id);
      state = loadStateForBoard(existing.id);
      refreshBoardSelect();
    } else {
      // Create empty board with the requested name
      createBoard(requestedName, []);
    }
    bindUI();
    setupDnD();
    renderBoard();
    return;
  }

  let meta = loadBoardsMeta();
  let curId = getCurrentBoardId();

  if (!meta.length) {
    // Try migrate legacy single-board data
    let legacy = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      legacy = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(legacy)) legacy = [];
    } catch { legacy = []; }

    if (legacy.length) {
      createBoard("Quadro 1", legacy);
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    } else {
      createBoard("Quadro 1", []);
      maybeSeed();
    }
  } else {
    if (!curId || !meta.some((b) => b.id === curId)) {
      curId = meta[0].id;
      setCurrentBoardId(curId);
    } else {
      setCurrentBoardId(curId);
    }
    state = loadStateForBoard(curId);
    refreshBoardSelect();
    if (!state.length && meta.length === 1) {
      maybeSeed();
    }
  }

  bindUI();
  setupDnD();
  renderBoard();
}

// Export board as image (PNG)
async function exportBoardImage() {
  const root = document.documentElement;
  try {
    // Close any open menus so they don't appear in the capture
    if (typeof closeMenus === 'function') closeMenus();
    const target = document.body; // capture header + board
    if (!window.html2canvas) {
      alert("Ferramenta de captura indisponível.");
      return;
    }
    // Temporarily remove shadows for export
    root.classList.add('no-shadow-export');
    // ensure UI settles
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const canvas = await window.html2canvas(target, {
      scale,
      useCORS: true,
      backgroundColor: getComputedStyle(document.body).backgroundColor || undefined,
      logging: false,
    });
    const dataUrl = canvas.toDataURL("image/png");
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fileName = `scrumy-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.error("Falha ao exportar imagem:", err);
    alert("Não foi possível gerar a imagem do quadro.");
  } finally {
    root.classList.remove('no-shadow-export');
  }
}

// Export current board as JSON
function exportBoardJson() {
  try {
    if (!currentBoardId) {
      alert("Nenhum quadro selecionado.");
      return;
    }
    const meta = loadBoardsMeta();
    const cur = meta.find((b) => b.id === currentBoardId) || {};
    const payload = {
      id: currentBoardId,
      name: cur.name || "Quadro",
      createdAt: cur.createdAt || null,
      updatedAt: cur.updatedAt || null,
      lanes: getLanesCount(),
      storyNotes: getStoryNotes(),
      cards: state
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const slug = (cur.name || "quadro")
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'quadro';
    const fileName = `scrumy-${slug}-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    if (typeof closeMenus === 'function') closeMenus();
  } catch (err) {
    console.error('Falha ao exportar JSON:', err);
    alert('Não foi possível exportar JSON do quadro.');
  }
}

// Import from selected JSON file
function importBoardJsonFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = reader.result;
      const data = JSON.parse(text);
      let cards = [];
      let name = '';
      let lanes = 1;
      let storyNotes = [];
      if (data && Array.isArray(data.cards)) {
        cards = data.cards;
        name = data.name || '';
        lanes = (typeof data.lanes === 'number' && data.lanes > 0) ? Math.floor(data.lanes) : 1;
        if (Array.isArray(data.storyNotes)) storyNotes = data.storyNotes;
      } else if (Array.isArray(data)) {
        cards = data;
      } else {
        throw new Error('Formato de JSON inválido.');
      }
      // Normalize cards
      const validStatuses = new Set(STATUSES.map(s => s.key));
      const validColors = new Set(['yellow','blue','red','green','gray']);
      const normalized = (cards || []).map((c) => {
        const id = c && typeof c.id === 'string' && c.id ? c.id : uid();
        const title = c && typeof c.title === 'string' ? c.title : '';
        const description = c && typeof c.description === 'string' ? c.description : '';
        const observation = c && typeof c.observation === 'string' ? c.observation : '';
        let status = c && typeof c.status === 'string' && validStatuses.has(c.status) ? c.status : 'backlog';
        if (status === 'story') status = 'backlog';
        const color = c && typeof c.color === 'string' && validColors.has(c.color) ? c.color : 'yellow';
        const lane = (c && typeof c.lane === 'number' && c.lane >= 0) ? Math.floor(c.lane) : 0;
        const createdAt = (c && typeof c.createdAt === 'number') ? c.createdAt : Date.now();
        return { id, title, description, observation, status, color, lane, createdAt };
      });
      const asNew = confirm('Importar como novo quadro?\nOK = criar novo quadro\nCancelar = substituir quadro atual');
      if (asNew) {
        createBoard(name || 'Importado', normalized, lanes, storyNotes);
      } else {
        // When replacing current board, update lanes and story notes BEFORE rendering
        setLanesCount(lanes);
        setStoryNotes(storyNotes);
        state = normalized;
        saveState();
        renderBoard();
      }
      if (typeof closeMenus === 'function') closeMenus();
      alert('Importação concluída.');
    } catch (err) {
      console.error('Falha ao importar JSON:', err);
      alert('Falha ao importar JSON. Verifique o arquivo e tente novamente.');
    }
  };
  reader.onerror = () => {
    alert('Não foi possível ler o arquivo selecionado.');
  };
  reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded", init);

