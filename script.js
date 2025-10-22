const STORAGE_KEY = "scrumy.board.v1"; // legacy single-board key (for migration)
const THEME_STORAGE_KEY = "scrumy.theme.v1";
const BOARDS_META_KEY = "scrumy.boards.meta.v1";
const CURRENT_BOARD_KEY = "scrumy.current.boardId.v1";
const BOARD_STATE_PREFIX = "scrumy.board.v1."; // per-board state: scrumy.board.v1.<id>
const STATUSES = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "A Fazer" },
  { key: "doing", label: "Fazendo" },
  { key: "review", label: "Revisão" },
  { key: "done", label: "Concluído" }
];

let state = [];
let currentBoardId = null;

function uid() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
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

function loadStateForBoard(id) {
  try {
    const raw = localStorage.getItem(boardKey(id));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function updateCurrentBoardName() {
  const el = document.getElementById('currentBoardName');
  if (!el) return;
  const meta = loadBoardsMeta();
  const cur = meta.find((b) => b.id === currentBoardId);
  el.textContent = cur && cur.name ? cur.name : '';
}

function findCard(id) {
  return state.find((c) => c.id === id);
}

function renderBoard() {
  document.querySelectorAll(".column-cards").forEach((col) => (col.innerHTML = ""));
  for (const status of STATUSES) {
    const container = document.querySelector(`.column-cards[data-status="${status.key}"]`);
    const cards = state.filter((c) => c.status === status.key);
    for (const card of cards) {
      container.appendChild(renderCard(card));
    }
  }
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

function createBoard(name, initialState = []) {
  const meta = loadBoardsMeta();
  const id = "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const boardMeta = { id, name: name || "Novo Quadro", createdAt: Date.now(), updatedAt: Date.now() };
  meta.push(boardMeta);
  saveBoardsMeta(meta);
  localStorage.setItem(boardKey(id), JSON.stringify(initialState));
  setCurrentBoardId(id);
  state = initialState.slice();
  refreshBoardSelect();
  renderBoard();
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
  }
}

function loadBoard(id) {
  setCurrentBoardId(id);
  state = loadStateForBoard(id);
  refreshBoardSelect();
  renderBoard();
}

function saveBoardAs(name) {
  const clone = state.map((c) => ({ ...c }));
  createBoard(name || "Cópia do Quadro", clone);
}

function renderCard(card) {
  const el = document.createElement("article");
  el.className = "card";
  el.draggable = true;
  el.dataset.id = card.id;

  const head = document.createElement("div");
  head.className = "card-head";

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = card.title || "(Sem título)";

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "icon-btn";
  editBtn.title = "Editar";
  editBtn.textContent = "✎";
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openModal({ mode: "edit", card });
  });

  const delBtn = document.createElement("button");
  delBtn.className = "icon-btn danger";
  delBtn.title = "Excluir";
  delBtn.textContent = "🗑";
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const ok = confirm("Deseja excluir esta tarefa?");
    if (!ok) return;
    state = state.filter((c) => c.id !== card.id);
    saveState();
    renderBoard();
  });

  actions.append(editBtn, delBtn);
  head.append(title, actions);

  const desc = document.createElement("p");
  desc.className = "card-desc";
  desc.textContent = card.description || "";

  el.append(head, desc);

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
      e.preventDefault();
      col.classList.add("drop-target");
      e.dataTransfer.dropEffect = "move";
    });
    col.addEventListener("dragleave", () => col.classList.remove("drop-target"));
    col.addEventListener("drop", (e) => {
      e.preventDefault();
      col.classList.remove("drop-target");
      const id = e.dataTransfer.getData("text/plain");
      if (!id) return;
      const card = findCard(id);
      if (!card) return;
      const toStatus = col.dataset.status;
      if (card.status === toStatus) return;
      card.status = toStatus;
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
  const statusSelect = document.getElementById("statusSelect");

  if (mode === "edit" && card) {
    titleEl.textContent = "Editar Tarefa";
    idEl.value = card.id;
    titleInput.value = card.title || "";
    descInput.value = card.description || "";
    statusSelect.value = card.status;
  } else {
    titleEl.textContent = "Nova Tarefa";
    idEl.value = "";
    titleInput.value = "";
    descInput.value = "";
    statusSelect.value = "backlog";
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
    const status = document.getElementById("statusSelect").value;
    if (!title) return;

    if (id) {
      const existing = findCard(id);
      if (existing) {
        existing.title = title;
        existing.description = description;
        existing.status = status;
      }
    } else {
      state.push({ id: uid(), title, description, status, createdAt: Date.now() });
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
      createBoard(name.trim() || "Novo Quadro", []);
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
  try {
    // Close any open menus so they don't appear in the capture
    if (typeof closeMenus === 'function') closeMenus();
    const target = document.body; // capture header + board
    if (!window.html2canvas) {
      alert("Ferramenta de captura indisponível.");
      return;
    }
    // ensure modal borders/hover states settle
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
      if (data && Array.isArray(data.cards)) {
        cards = data.cards;
        name = data.name || '';
      } else if (Array.isArray(data)) {
        cards = data;
      } else {
        throw new Error('Formato de JSON inválido.');
      }
      // Normalize cards
      const validStatuses = new Set(STATUSES.map(s => s.key));
      const normalized = (cards || []).map((c) => {
        const id = c && typeof c.id === 'string' && c.id ? c.id : uid();
        const title = c && typeof c.title === 'string' ? c.title : '';
        const description = c && typeof c.description === 'string' ? c.description : '';
        const status = c && typeof c.status === 'string' && validStatuses.has(c.status) ? c.status : 'backlog';
        const createdAt = (c && typeof c.createdAt === 'number') ? c.createdAt : Date.now();
        return { id, title, description, status, createdAt };
      });
      const asNew = confirm('Importar como novo quadro?\nOK = criar novo quadro\nCancelar = substituir quadro atual');
      if (asNew) {
        createBoard(name || 'Importado', normalized);
      } else {
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

