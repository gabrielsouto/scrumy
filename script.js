const STORAGE_KEY = "scrumy.board.v1";
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
  state = loadState();
  if (!state.length) maybeSeed();
  bindUI();
  setupDnD();
  renderBoard();
}

document.addEventListener("DOMContentLoaded", init);

