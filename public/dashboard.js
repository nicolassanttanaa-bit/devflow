// ============================================================
// Validação de CPF/CNPJ (espelha a validação do servidor, para
// dar feedback imediato antes de enviar o formulário)
// ============================================================
function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidCPF(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10 || d1 === 11) d1 = 0;
  if (d1 !== parseInt(cpf[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10 || d2 === 11) d2 = 0;
  return d2 === parseInt(cpf[10], 10);
}

function isValidCNPJ(value) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const calcDigit = (base) => {
    let pos = base.length - 7;
    let sum = 0;
    for (let i = base.length; i >= 1; i--) {
      sum += parseInt(base[base.length - i], 10) * pos--;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11;
    return result < 2 ? 0 : 11 - result;
  };
  const base = cnpj.substring(0, 12);
  const d1 = calcDigit(base);
  const d2 = calcDigit(base + d1);
  return cnpj === base + String(d1) + String(d2);
}

function formatDocument(value, type) {
  const digits = onlyDigits(value).slice(0, type === 'cnpj' ? 14 : 11);
  if (type === 'cnpj') {
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

// ============================================================
// Estado em memória
// ============================================================
let clients = [];
let currentTagList = [];

// ============================================================
// Auth: confere sessão, preenche e-mail, liga logout
// ============================================================
async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) throw new Error('não autenticado');
    const data = await res.json();
    document.getElementById('userEmail').textContent = data.email;
  } catch (err) {
    window.location.href = 'index.html';
  }
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = 'index.html';
});

// ============================================================
// Navegação entre views
// ============================================================
const navItems = document.querySelectorAll('.nav-item');
const views = {
  home: document.getElementById('homeView'),
  clients: document.getElementById('clientsView'),
  projects: document.getElementById('projectsView'),
};
const viewTitle = document.getElementById('viewTitle');
const viewEyebrow = document.getElementById('viewEyebrow');
const newBtn = document.getElementById('newBtn');
const exportBtn = document.getElementById('exportBtn');

let activeView = 'home';

function setActiveView(view) {
  activeView = view;
  navItems.forEach((item) => item.classList.toggle('is-active', item.dataset.view === view));
  Object.entries(views).forEach(([key, el]) => {
    el.hidden = key !== view;
  });

  if (view === 'home') {
    viewEyebrow.textContent = 'menu principal/';
    viewTitle.textContent = 'Visão geral';
    newBtn.hidden = true;
    exportBtn.hidden = true;
  } else if (view === 'clients') {
    viewEyebrow.textContent = 'clientes/';
    viewTitle.textContent = 'Clientes';
    newBtn.hidden = false;
    newBtn.textContent = '+ novo cliente';
    exportBtn.hidden = true;
  } else {
    viewEyebrow.textContent = 'sistemas/';
    viewTitle.textContent = 'Sistemas';
    newBtn.hidden = false;
    newBtn.textContent = '+ novo sistema';
    exportBtn.hidden = false;
  }
}

navItems.forEach((item) => {
  item.addEventListener('click', () => setActiveView(item.dataset.view));
});

newBtn.addEventListener('click', () => {
  if (activeView === 'clients') {
    openClientModal();
  } else if (activeView === 'projects') {
    openProjectModal();
  }
});

// ============================================================
// Exportar sistemas para um arquivo .txt (baixa direto pelo navegador)
// ============================================================
function exportProjectsToTxt() {
  const now = new Date();
  const lines = [];

  lines.push('RELATÓRIO DE SISTEMAS — devflow');
  lines.push(`Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`);
  lines.push(`Total de sistemas: ${projectsData.length}`);
  lines.push('='.repeat(60));
  lines.push('');

  if (projectsData.length === 0) {
    lines.push('Nenhum sistema cadastrado ainda.');
  }

  projectsData.forEach((project, index) => {
    const priceText = project.price != null && project.price !== ''
      ? currencyFormatter.format(project.price)
      : 'a combinar';
    const deadlineText = project.deadline
      ? new Date(project.deadline + 'T00:00:00').toLocaleDateString('pt-BR')
      : 'sem prazo definido';

    lines.push(`[${index + 1}] ${project.name || 'sem nome'}`);
    lines.push(`Cliente: ${project.client_name}`);
    lines.push(`Documento: ${project.client_document || '—'}`);
    lines.push(`Telefone: ${project.client_phone || '—'}`);
    lines.push(`E-mail: ${project.client_email || '—'}`);
    lines.push(`Descrição: ${project.description}`);
    lines.push(`Linguagens: ${project.languages || '—'}`);
    lines.push(`Valor: ${priceText}`);
    lines.push(`Prazo de entrega: ${deadlineText}`);
    lines.push(`Status: ${statusLabels[project.status] || project.status}`);
    lines.push('-'.repeat(60));
    lines.push('');
  });

  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const dateSlug = now.toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sistemas-devflow-${dateSlug}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

exportBtn.addEventListener('click', exportProjectsToTxt);

// ============================================================
// Modais: abrir/fechar
// ============================================================
function openModal(id) {
  document.getElementById(id).hidden = false;
}
function closeModal(id) {
  document.getElementById(id).hidden = true;
}

document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
});
document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.hidden = true;
  });
});

// ============================================================
// CLIENTES
// ============================================================
const clientsBody = document.getElementById('clientsBody');
const clientsEmpty = document.getElementById('clientsEmpty');
const clientForm = document.getElementById('clientForm');
const documentTypeSelect = document.getElementById('documentType');
const clientDocumentInput = document.getElementById('clientDocument');
const clientPhoneInput = document.getElementById('clientPhone');

function updateDocumentPlaceholder() {
  clientDocumentInput.placeholder =
    documentTypeSelect.value === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00';
}
documentTypeSelect.addEventListener('change', updateDocumentPlaceholder);
updateDocumentPlaceholder();

clientDocumentInput.addEventListener('input', () => {
  clientDocumentInput.value = formatDocument(clientDocumentInput.value, documentTypeSelect.value);
});
clientPhoneInput.addEventListener('input', () => {
  clientPhoneInput.value = formatPhone(clientPhoneInput.value);
});

function openClientModal(client) {
  clientForm.reset();
  document.getElementById('clientId').value = '';
  document.getElementById('clientNameError').textContent = '';
  document.getElementById('clientDocumentError').textContent = '';
  clientDocumentInput.classList.remove('invalid');

  if (client) {
    document.getElementById('clientModalTitle').textContent = 'Editar cliente';
    document.getElementById('clientId').value = client.id;
    document.getElementById('clientName').value = client.name;
    documentTypeSelect.value = client.document_type || 'cpf';
    clientDocumentInput.value = client.document || '';
    clientPhoneInput.value = client.phone || '';
    document.getElementById('clientEmail').value = client.email || '';
    document.getElementById('clientNotes').value = client.notes || '';
  } else {
    document.getElementById('clientModalTitle').textContent = 'Novo cliente';
  }
  updateDocumentPlaceholder();
  openModal('clientModal');
}

async function loadClients() {
  const res = await fetch('/api/clients');
  clients = await res.json();
  renderClients();
}

function renderClients() {
  clientsBody.innerHTML = '';
  clientsEmpty.hidden = clients.length > 0;

  clients.forEach((client) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(client.name)}</td>
      <td class="cell-muted">${escapeHtml(client.document || '—')}</td>
      <td class="cell-muted">${escapeHtml(client.phone || '—')}</td>
      <td class="cell-muted">${escapeHtml(client.email || '—')}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" data-edit-client="${client.id}" aria-label="Editar">✎</button>
          <button class="icon-btn danger" data-delete-client="${client.id}" aria-label="Excluir">🗑</button>
        </div>
      </td>
    `;
    clientsBody.appendChild(tr);
  });

  clientsBody.querySelectorAll('[data-edit-client]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const client = clients.find((c) => c.id == btn.dataset.editClient);
      openClientModal(client);
    });
  });
  clientsBody.querySelectorAll('[data-delete-client]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir este cliente? Os sistemas vinculados a ele também serão removidos.')) return;
      await fetch(`/api/clients/${btn.dataset.deleteClient}`, { method: 'DELETE' });
      await loadClients();
      await loadProjects();
    });
  });
}

clientForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const id = document.getElementById('clientId').value;
  const name = document.getElementById('clientName').value.trim();
  const documentType = documentTypeSelect.value;
  const documentValue = clientDocumentInput.value.trim();

  document.getElementById('clientNameError').textContent = '';
  document.getElementById('clientDocumentError').textContent = '';
  clientDocumentInput.classList.remove('invalid');

  if (!name) {
    document.getElementById('clientNameError').textContent = 'informe o nome do cliente';
    return;
  }

  if (documentValue) {
    const valid = documentType === 'cnpj' ? isValidCNPJ(documentValue) : isValidCPF(documentValue);
    if (!valid) {
      clientDocumentInput.classList.add('invalid');
      document.getElementById('clientDocumentError').textContent =
        `${documentType.toUpperCase()} inválido — confira os números digitados`;
      return;
    }
  }

  const payload = {
    name,
    documentType,
    document: documentValue,
    phone: clientPhoneInput.value.trim(),
    email: document.getElementById('clientEmail').value.trim(),
    notes: document.getElementById('clientNotes').value.trim(),
  };

  const url = id ? `/api/clients/${id}` : '/api/clients';
  const method = id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (!res.ok) {
    if (data.field === 'document') {
      clientDocumentInput.classList.add('invalid');
      document.getElementById('clientDocumentError').textContent = data.message;
    } else {
      document.getElementById('clientNameError').textContent = data.message || 'erro ao salvar';
    }
    return;
  }

  closeModal('clientModal');
  await loadClients();
});

// ============================================================
// PROJETOS / SISTEMAS
// ============================================================
const projectsGrid = document.getElementById('projectsGrid');
const projectsEmpty = document.getElementById('projectsEmpty');
const projectForm = document.getElementById('projectForm');
const projectClientSelect = document.getElementById('projectClient');
const langCheckboxGrid = document.getElementById('langCheckboxGrid');
const primaryLangField = document.getElementById('primaryLangField');
const primaryLangOptions = document.getElementById('primaryLangOptions');

// Lista fixa de linguagens/tecnologias disponíveis para escolha.
const AVAILABLE_LANGUAGES = [
  'Python', 'JavaScript', 'HTML', 'CSS', 'Java',
  'C++', 'C#', 'C', 'Go', 'Lua', 'Ruby',
];

let projectsData = [];
let primaryLanguage = null; // linguagem marcada como principal no formulário atual

const statusLabels = {
  orcamento: 'Orçamento enviado',
  aprovado: 'Aprovado',
  desenvolvimento: 'Em desenvolvimento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

// ------------------------------------------------------------------
// Checkboxes de linguagem (currentTagList guarda as selecionadas, na
// ordem em que foram marcadas — a primeira posição, ao salvar, sempre
// será a linguagem principal escolhida).
// ------------------------------------------------------------------
function renderLangCheckboxes() {
  langCheckboxGrid.innerHTML = '';
  AVAILABLE_LANGUAGES.forEach((lang) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-toggle' + (currentTagList.includes(lang) ? ' is-selected' : '');
    btn.textContent = lang;
    btn.addEventListener('click', () => {
      const idx = currentTagList.indexOf(lang);
      if (idx === -1) {
        currentTagList.push(lang);
      } else {
        currentTagList.splice(idx, 1);
        if (primaryLanguage === lang) primaryLanguage = null;
      }
      renderLangCheckboxes();
      renderPrimaryOptions();
    });
    langCheckboxGrid.appendChild(btn);
  });
}

function renderPrimaryOptions() {
  if (currentTagList.length <= 1) {
    primaryLangField.hidden = true;
    primaryLanguage = currentTagList[0] || null;
    return;
  }

  if (!primaryLanguage || !currentTagList.includes(primaryLanguage)) {
    primaryLanguage = currentTagList[0];
  }

  primaryLangField.hidden = false;
  primaryLangOptions.innerHTML = '';
  currentTagList.forEach((lang, index) => {
    const label = document.createElement('label');
    label.className = 'primary-lang-option';
    label.innerHTML = `
      <input type="radio" name="primaryLang" value="${escapeHtml(lang)}" ${lang === primaryLanguage ? 'checked' : ''}>
      ${escapeHtml(lang)}
    `;
    label.querySelector('input').addEventListener('change', () => {
      primaryLanguage = lang;
    });
    primaryLangOptions.appendChild(label);
  });
}

function populateClientSelect() {
  projectClientSelect.innerHTML = '<option value="">selecione um cliente…</option>';
  clients.forEach((client) => {
    const opt = document.createElement('option');
    opt.value = client.id;
    opt.textContent = client.name;
    projectClientSelect.appendChild(opt);
  });
}

function openProjectModal(project) {
  projectForm.reset();
  document.getElementById('projectId').value = '';
  document.getElementById('projectNameError').textContent = '';
  document.getElementById('projectClientError').textContent = '';
  document.getElementById('projectDescriptionError').textContent = '';
  populateClientSelect();
  currentTagList = [];
  primaryLanguage = null;

  if (project) {
    document.getElementById('projectModalTitle').textContent = 'Editar sistema';
    document.getElementById('projectId').value = project.id;
    document.getElementById('projectName').value = project.name || '';
    projectClientSelect.value = project.client_id;
    document.getElementById('projectDescription').value = project.description;
    document.getElementById('projectPrice').value = project.price || '';
    document.getElementById('projectDeadline').value = project.deadline || '';
    document.getElementById('projectStatus').value = project.status || 'orcamento';
    // A primeira linguagem salva é sempre a principal (por convenção).
    currentTagList = project.languages
      ? project.languages.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    primaryLanguage = currentTagList[0] || null;
  } else {
    document.getElementById('projectModalTitle').textContent = 'Novo sistema';
  }

  renderLangCheckboxes();
  renderPrimaryOptions();
  openModal('projectModal');
}

async function loadProjects() {
  const res = await fetch('/api/projects');
  projectsData = await res.json();
  renderProjects();
  renderHomeDashboard();
}

function renderProjects() {
  projectsGrid.innerHTML = '';
  projectsEmpty.hidden = projectsData.length > 0;

  projectsData.forEach((project) => {
    const languagesList = (project.languages || '')
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);
    const primary = languagesList[0] || null;

    const languagesHtml = languagesList
      .map((l, i) => `<span class="pill${i === 0 ? ' pill-primary' : ''}">${escapeHtml(l)}</span>`)
      .join('');

    const priceText = project.price != null && project.price !== ''
      ? currencyFormatter.format(project.price)
      : 'valor a combinar';

    const deadlineText = project.deadline
      ? new Date(project.deadline + 'T00:00:00').toLocaleDateString('pt-BR')
      : 'sem prazo definido';

    const card = document.createElement('article');
    card.className = `project-card project-card--${project.status}`;
    card.dataset.projectId = project.id;
    card.innerHTML = `
      ${primary ? `<span class="project-lang-badge">${escapeHtml(primary)}</span>` : ''}
      <span class="project-logo-badge">&gt;_</span>
      <div class="project-card-actions">
        <button class="icon-btn" data-edit-project="${project.id}" aria-label="Editar">✎</button>
        <button class="icon-btn danger" data-delete-project="${project.id}" aria-label="Excluir">🗑</button>
      </div>
      <div class="project-card-header">
        <div>
          <span class="project-client">${escapeHtml(project.name || 'sem nome')}</span>
          <span class="project-client-sub">${escapeHtml(project.client_name)}</span>
        </div>
      </div>
      <p class="project-description">${escapeHtml(project.description)}</p>
      <div class="project-tags">${languagesHtml || '<span class="cell-muted">sem linguagem definida</span>'}</div>
      <div class="project-meta">
        <span>${priceText}</span>
        <span>${deadlineText}</span>
      </div>
      <div>
        <span class="badge badge-${project.status}">${statusLabels[project.status] || project.status}</span>
      </div>
    `;
    projectsGrid.appendChild(card);
  });

  // Abrir detalhes ao clicar no card (fora dos botões de ação)
  projectsGrid.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-edit-project], [data-delete-project]')) return;
      const project = projectsData.find((p) => p.id == card.dataset.projectId);
      openProjectDetail(project);
    });
  });

  projectsGrid.querySelectorAll('[data-edit-project]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const project = projectsData.find((p) => p.id == btn.dataset.editProject);
      openProjectModal(project);
    });
  });
  projectsGrid.querySelectorAll('[data-delete-project]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir este sistema/projeto?')) return;
      await fetch(`/api/projects/${btn.dataset.deleteProject}`, { method: 'DELETE' });
      await loadProjects();
    });
  });
}

projectForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const id = document.getElementById('projectId').value;
  const name = document.getElementById('projectName').value.trim();
  const clientId = projectClientSelect.value;
  const description = document.getElementById('projectDescription').value.trim();

  document.getElementById('projectNameError').textContent = '';
  document.getElementById('projectClientError').textContent = '';
  document.getElementById('projectDescriptionError').textContent = '';

  if (!name) {
    document.getElementById('projectNameError').textContent = 'dê um nome para o sistema';
    return;
  }
  if (!clientId) {
    document.getElementById('projectClientError').textContent = 'selecione um cliente';
    return;
  }
  if (!description) {
    document.getElementById('projectDescriptionError').textContent = 'descreva o sistema';
    return;
  }

  // A principal sempre vai em primeiro no texto salvo — é assim que o
  // resto do app (card, detalhes) sabe qual delas é a principal.
  const orderedLanguages = primaryLanguage
    ? [primaryLanguage, ...currentTagList.filter((l) => l !== primaryLanguage)]
    : currentTagList;

  const payload = {
    name,
    clientId,
    description,
    languages: orderedLanguages.join(', '),
    price: document.getElementById('projectPrice').value || null,
    deadline: document.getElementById('projectDeadline').value || null,
    status: document.getElementById('projectStatus').value,
  };

  const url = id ? `/api/projects/${id}` : '/api/projects';
  const method = id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (!res.ok) {
    if (data.field === 'name') {
      document.getElementById('projectNameError').textContent = data.message;
    } else if (data.field === 'clientId') {
      document.getElementById('projectClientError').textContent = data.message;
    } else {
      document.getElementById('projectDescriptionError').textContent = data.message || 'erro ao salvar';
    }
    return;
  }

  closeModal('projectModal');
  await loadProjects();
});

// ============================================================
// Menu Principal: contadores por status + agenda de prazos
// ============================================================
function renderHomeDashboard() {
  const statsGrid = document.getElementById('statsGrid');
  const counts = { orcamento: 0, aprovado: 0, desenvolvimento: 0, concluido: 0, cancelado: 0 };
  projectsData.forEach((p) => {
    if (counts[p.status] !== undefined) counts[p.status] += 1;
  });

  statsGrid.innerHTML = `
    <div class="stat-card stat-card--total">
      <div class="stat-value">${projectsData.length}</div>
      <div class="stat-label">total de sistemas</div>
    </div>
    ${Object.entries(counts)
      .map(
        ([status, count]) => `
      <div class="stat-card stat-card--${status}">
        <div class="stat-value">${count}</div>
        <div class="stat-label">${statusLabels[status]}</div>
      </div>
    `
      )
      .join('')}
  `;

  // ---- Agenda de prazos ----
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const withDeadline = projectsData
    .filter((p) => p.deadline && p.status !== 'concluido' && p.status !== 'cancelado')
    .map((p) => ({ ...p, deadlineDate: new Date(p.deadline + 'T00:00:00') }))
    .sort((a, b) => a.deadlineDate - b.deadlineDate);

  const overdue = withDeadline.filter((p) => p.deadlineDate < today);
  const thisWeek = withDeadline.filter((p) => p.deadlineDate >= today && p.deadlineDate <= in7Days);
  const restOfMonth = withDeadline.filter(
    (p) => p.deadlineDate > in7Days && p.deadlineDate <= endOfMonth
  );

  renderAgendaColumn('overdueList', 'overdueEmpty', overdue);
  renderAgendaColumn('weekList', 'weekEmpty', thisWeek);
  renderAgendaColumn('monthList', 'monthEmpty', restOfMonth);
}

function renderAgendaColumn(listId, emptyId, items) {
  const list = document.getElementById(listId);
  const empty = document.getElementById(emptyId);
  list.innerHTML = '';
  empty.hidden = items.length > 0;

  items.forEach((project) => {
    const item = document.createElement('div');
    item.className = `agenda-item project-card--${project.status}`;
    item.innerHTML = `
      <span class="agenda-item-title">${escapeHtml(project.name || 'sem nome')}</span>
      <span class="agenda-item-sub">${escapeHtml(project.client_name)}</span>
      <span class="agenda-item-date">${project.deadlineDate.toLocaleDateString('pt-BR')} · ${statusLabels[project.status]}</span>
    `;
    item.addEventListener('click', () => openProjectDetail(project));
    list.appendChild(item);
  });
}

// ============================================================
// Detalhes do sistema (modal com abas: Detalhes / Arquivos)
// ============================================================
const detailTabs = document.querySelectorAll('#projectDetailModal .tab-btn');
const detailPanels = document.querySelectorAll('#projectDetailModal .tab-panel');

detailTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    detailTabs.forEach((t) => t.classList.toggle('is-active', t === tab));
    detailPanels.forEach((panel) => {
      panel.hidden = panel.dataset.tabPanel !== tab.dataset.tab;
    });
  });
});

function resetDetailTabs() {
  detailTabs.forEach((t, i) => t.classList.toggle('is-active', i === 0));
  detailPanels.forEach((panel) => {
    panel.hidden = panel.dataset.tabPanel !== 'details';
  });
}

let currentDetailProject = null;

function openProjectDetail(project) {
  currentDetailProject = project;
  document.getElementById('detailProjectName').textContent = project.name || 'sem nome';
  document.getElementById('detailClientName').textContent = project.client_name;

  const badge = document.getElementById('detailStatusBadge');
  badge.textContent = statusLabels[project.status] || project.status;
  badge.className = `badge badge-${project.status}`;

  const createdAt = project.created_at
    ? new Date(project.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR')
    : '';
  document.getElementById('detailCreatedAt').textContent = createdAt ? `criado em ${createdAt}` : '';

  document.getElementById('detailClientDocument').textContent = project.client_document || '—';
  document.getElementById('detailClientPhone').textContent = project.client_phone || '—';
  document.getElementById('detailClientEmail').textContent = project.client_email || '—';
  document.getElementById('detailDescription').textContent = project.description;

  const languages = (project.languages || '')
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);
  const detailLanguages = document.getElementById('detailLanguages');
  detailLanguages.innerHTML = languages.length
    ? languages.map((l, i) => `<span class="pill${i === 0 ? ' pill-primary' : ''}">${i === 0 ? '★ ' : ''}${escapeHtml(l)}</span>`).join('')
    : '<span class="cell-muted">sem linguagem definida</span>';

  document.getElementById('detailPrice').textContent =
    project.price != null && project.price !== '' ? currencyFormatter.format(project.price) : 'a combinar';
  document.getElementById('detailDeadline').textContent = project.deadline
    ? new Date(project.deadline + 'T00:00:00').toLocaleDateString('pt-BR')
    : 'sem prazo definido';

  document.getElementById('detailEditBtn').onclick = () => {
    closeModal('projectDetailModal');
    openProjectModal(project);
  };

  resetDetailTabs();
  openModal('projectDetailModal');
}

// ============================================================
// Exportar informações do sistema como .txt (baixa para Downloads)
// ============================================================
function sanitizeFilename(name) {
  const clean = String(name || 'sistema')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return clean || 'sistema';
}

function buildProjectTxt(project) {
  const languages = (project.languages || '')
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);

  const priceText =
    project.price != null && project.price !== '' ? currencyFormatter.format(project.price) : 'a combinar';

  const deadlineText = project.deadline
    ? new Date(project.deadline + 'T00:00:00').toLocaleDateString('pt-BR')
    : 'sem prazo definido';

  const createdAtText = project.created_at
    ? new Date(project.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR')
    : '—';

  const geradoEm = new Date().toLocaleString('pt-BR');

  return [
    '========================================',
    ` SISTEMA: ${project.name || 'sem nome'}`,
    '========================================',
    '',
    '--- CLIENTE ---',
    `Nome: ${project.client_name || '—'}`,
    `Documento: ${project.client_document || '—'}`,
    `Telefone: ${project.client_phone || '—'}`,
    `E-mail: ${project.client_email || '—'}`,
    '',
    '--- DESCRIÇÃO DO SISTEMA ---',
    project.description || '—',
    '',
    '--- DETALHES ---',
    `Linguagens/tecnologias: ${languages.length ? languages.join(', ') : '—'}`,
    `Valor: ${priceText}`,
    `Prazo de entrega: ${deadlineText}`,
    `Status: ${statusLabels[project.status] || project.status}`,
    `Criado em: ${createdAtText}`,
    '',
    '----------------------------------------',
    `Gerado automaticamente pelo devflow em ${geradoEm}`,
  ].join('\n');
}

document.getElementById('createFolderBtn').addEventListener('click', () => {
  if (!currentDetailProject) return;

  const content = buildProjectTxt(currentDetailProject);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(currentDetailProject.name)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

// ============================================================
// Util
// ============================================================
function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

// ============================================================
// Inicialização
// ============================================================
(async function init() {
  await checkAuth();
  setActiveView('home');
  await loadClients();
  await loadProjects();
})();
