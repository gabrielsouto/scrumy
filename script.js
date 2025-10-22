const STORAGE_KEY = "scrumy.board.v1";
const THEME_STORAGE_KEY = "scrumy.theme.v1";
const STATUSES = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "A Fazer" },
  { key: "doing", label: "Fazendo" },
  { key: "review", label: "Revisão" },
  { key: "done", label: "Concluído" }
];

let state = [];

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  state = loadState();
  if (!state.length) maybeSeed();
  bindUI();
  setupDnD();
  renderBoard();
}

// Export board as image (PNG)
async function exportBoardImage() {
  try {
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

document.addEventListener("DOMContentLoaded", init);

