// server.js
// Servidor Express que serve o site (pasta "public") e expoe as rotas
// de autenticacao (/api/register, /api/login, /api/logout, /api/me).

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const {
  createUser,
  findUserByEmail,
  listClients,
  createClient,
  getClient,
  findClientByDocument,
  findClientByEmail,
  updateClient,
  deleteClient,
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
} = require('./db');
const { isValidDocument } = require('./validators');

const app = express();
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 12;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Necessário em produção (Render, Railway etc.): esses serviços ficam atrás
// de um proxy que termina o HTTPS antes de chegar no seu servidor. Sem isso,
// o Express não entende que a conexão é segura e o cookie de sessão (que usa
// "secure: true" em produção) não funciona direito, derrubando o login.
app.set('trust proxy', 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'defina_um_SESSION_SECRET_no_.env',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // "secure: true" exige HTTPS -- ative isso quando publicar em producao com HTTPS.
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
    },
  })
);

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ------------------------------------------------------------------
// POST /api/register  { email, password }
// ------------------------------------------------------------------
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ field: 'email', message: 'e-mail inválido' });
  }
  if (!password || password.length < 6) {
    return res
      .status(400)
      .json({ field: 'password', message: 'a senha deve ter ao menos 6 caracteres' });
  }

  const existing = findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ field: 'email', message: 'este e-mail já está cadastrado' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = createUser(email, passwordHash);

  req.session.userId = user.id;
  req.session.email = user.email;

  return res.status(201).json({ email: user.email });
});

// ------------------------------------------------------------------
// POST /api/login  { email, password }
// ------------------------------------------------------------------
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'informe e-mail e senha' });
  }

  const user = findUserByEmail(email);
  if (!user) {
    // Mensagem generica de proposito: nao revelamos se o e-mail existe ou nao.
    return res.status(401).json({ message: 'e-mail ou senha inválidos' });
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    return res.status(401).json({ message: 'e-mail ou senha inválidos' });
  }

  req.session.userId = user.id;
  req.session.email = user.email;

  return res.json({ email: user.email });
});

// ------------------------------------------------------------------
// POST /api/logout
// ------------------------------------------------------------------
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// ------------------------------------------------------------------
// GET /api/me  -> retorna o usuario logado (ou 401)
// ------------------------------------------------------------------
app.get('/api/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'não autenticado' });
  }
  res.json({ email: req.session.email });
});

// ------------------------------------------------------------------
// Middleware: exige estar logado para acessar as rotas abaixo dele
// ------------------------------------------------------------------
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'não autenticado' });
  }
  next();
}

// ------------------------------------------------------------------
// "Dono" da conta: usuário para o qual vão todos os pedidos recebidos
// pelo formulário público (definido pela variável OWNER_EMAIL no .env,
// que deve ser o e-mail da SUA conta cadastrada).
// ------------------------------------------------------------------
function getOwnerId() {
  const ownerEmail = (process.env.OWNER_EMAIL || '').trim();
  if (!ownerEmail) return null;
  const owner = findUserByEmail(ownerEmail);
  return owner ? owner.id : null;
}

// ==================================================================
// PEDIDO PÚBLICO (sem login) — formulário que qualquer visitante
// preenche para pedir um sistema. Cai automaticamente nos cadastros
// de cliente/sistema do "dono" configurado em OWNER_EMAIL.
// ==================================================================
app.post('/api/public/request', (req, res) => {
  const ownerId = getOwnerId();
  if (!ownerId) {
    return res.status(500).json({
      message:
        'o dono da conta ainda não foi configurado no servidor (defina OWNER_EMAIL no arquivo .env)',
    });
  }

  const { name, documentType, document, phone, email, description } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ field: 'name', message: 'informe seu nome' });
  }
  if (!description || !description.trim()) {
    return res
      .status(400)
      .json({ field: 'description', message: 'descreva o sistema que você precisa' });
  }
  if (document && document.trim() && !isValidDocument(document)) {
    return res.status(400).json({
      field: 'document',
      message: 'CPF ou CNPJ inválido (dígito verificador não confere)',
    });
  }

  // Reaproveita o cadastro do cliente se ele já pediu algo antes
  // (procura primeiro pelo documento, depois pelo e-mail).
  let client = null;
  if (document && document.trim()) {
    client = findClientByDocument(ownerId, document.trim());
  }
  if (!client && email && email.trim()) {
    client = findClientByEmail(ownerId, email.trim());
  }
  if (!client) {
    client = createClient(ownerId, {
      name: name.trim(),
      document,
      documentType,
      phone,
      email,
      notes: 'Cliente cadastrado automaticamente via formulário público de pedido.',
    });
  }

  createProject(ownerId, {
    clientId: client.id,
    description: description.trim(),
    languages: null,
    price: null,
    deadline: null,
    status: 'orcamento',
  });

  res.status(201).json({ ok: true });
});

// ==================================================================
// CLIENTES
// ==================================================================

app.get('/api/clients', requireAuth, (req, res) => {
  const clients = listClients(req.session.userId);
  res.json(clients);
});

app.post('/api/clients', requireAuth, (req, res) => {
  const { name, document, documentType, phone, email, notes } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ field: 'name', message: 'informe o nome do cliente' });
  }

  if (document && document.trim() && !isValidDocument(document)) {
    return res.status(400).json({
      field: 'document',
      message: 'CPF ou CNPJ inválido (dígito verificador não confere)',
    });
  }

  const client = createClient(req.session.userId, {
    name: name.trim(),
    document,
    documentType,
    phone,
    email,
    notes,
  });
  res.status(201).json(client);
});

app.put('/api/clients/:id', requireAuth, (req, res) => {
  const { name, document, documentType, phone, email, notes } = req.body || {};
  const existing = getClient(req.session.userId, req.params.id);
  if (!existing) return res.status(404).json({ message: 'cliente não encontrado' });

  if (!name || !name.trim()) {
    return res.status(400).json({ field: 'name', message: 'informe o nome do cliente' });
  }
  if (document && document.trim() && !isValidDocument(document)) {
    return res.status(400).json({
      field: 'document',
      message: 'CPF ou CNPJ inválido (dígito verificador não confere)',
    });
  }

  const updated = updateClient(req.session.userId, req.params.id, {
    name: name.trim(),
    document,
    documentType,
    phone,
    email,
    notes,
  });
  res.json(updated);
});

app.delete('/api/clients/:id', requireAuth, (req, res) => {
  const deleted = deleteClient(req.session.userId, req.params.id);
  if (!deleted) return res.status(404).json({ message: 'cliente não encontrado' });
  res.json({ ok: true });
});

// ==================================================================
// PROJETOS / SISTEMAS
// ==================================================================

app.get('/api/projects', requireAuth, (req, res) => {
  const projects = listProjects(req.session.userId);
  res.json(projects);
});

app.post('/api/projects', requireAuth, (req, res) => {
  const { clientId, description, languages, price, deadline, status } = req.body || {};

  if (!clientId) {
    return res.status(400).json({ field: 'clientId', message: 'selecione um cliente' });
  }
  if (!description || !description.trim()) {
    return res
      .status(400)
      .json({ field: 'description', message: 'descreva o sistema que será feito' });
  }
  const client = getClient(req.session.userId, clientId);
  if (!client) {
    return res.status(400).json({ field: 'clientId', message: 'cliente inválido' });
  }

  const project = createProject(req.session.userId, {
    clientId,
    description: description.trim(),
    languages,
    price,
    deadline,
    status,
  });
  res.status(201).json(project);
});

app.put('/api/projects/:id', requireAuth, (req, res) => {
  const { clientId, description, languages, price, deadline, status } = req.body || {};
  const existing = getProject(req.session.userId, req.params.id);
  if (!existing) return res.status(404).json({ message: 'projeto não encontrado' });

  if (!description || !description.trim()) {
    return res
      .status(400)
      .json({ field: 'description', message: 'descreva o sistema que será feito' });
  }

  const updated = updateProject(req.session.userId, req.params.id, {
    clientId: clientId || existing.client_id,
    description: description.trim(),
    languages,
    price,
    deadline,
    status,
  });
  res.json(updated);
});

app.delete('/api/projects/:id', requireAuth, (req, res) => {
  const deleted = deleteProject(req.session.userId, req.params.id);
  if (!deleted) return res.status(404).json({ message: 'projeto não encontrado' });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`devflow rodando em http://localhost:${PORT}`);
});
