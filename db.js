// db.js
// Configuracao do banco de dados SQLite (arquivo local: devflow.db)
// Usamos o modulo "node:sqlite", embutido no proprio Node.js (v22.5+/v24+).
// Vantagem: nao precisa compilar nada (evita o erro do Visual Studio no Windows).

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'devflow.db'));

// Cria a tabela de usuarios caso ainda nao exista.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Clientes cadastrados por cada usuário (freelancer).
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    document TEXT,
    document_type TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )
`);

// Sistemas/projetos vinculados a um cliente.
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    languages TEXT,
    price REAL,
    deadline TEXT,
    status TEXT NOT NULL DEFAULT 'orcamento',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (client_id) REFERENCES clients (id)
  )
`);

// Migração: adiciona a coluna "name" (nome do sistema) caso o banco já
// existisse de antes dessa funcionalidade. Se a coluna já existir, o
// ALTER TABLE dá erro — por isso o try/catch, que simplesmente ignora
// esse caso específico.
try {
  db.exec('ALTER TABLE projects ADD COLUMN name TEXT');
} catch (err) {
  if (!String(err.message).includes('duplicate column name')) throw err;
}

function createUser(email, passwordHash) {
  const stmt = db.prepare(
    'INSERT INTO users (email, password_hash) VALUES (?, ?)'
  );
  const info = stmt.run(email, passwordHash);
  return { id: info.lastInsertRowid, email };
}

function findUserByEmail(email) {
  const stmt = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)');
  return stmt.get(String(email || '').trim());
}

// ---------------------------------------------------------------- clientes

function listClients(userId) {
  const stmt = db.prepare(
    'SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC'
  );
  return stmt.all(userId);
}

function createClient(userId, data) {
  const stmt = db.prepare(`
    INSERT INTO clients (user_id, name, document, document_type, phone, email, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    userId,
    data.name,
    data.document || null,
    data.documentType || null,
    data.phone || null,
    data.email || null,
    data.notes || null
  );
  return getClient(userId, info.lastInsertRowid);
}

function getClient(userId, id) {
  const stmt = db.prepare('SELECT * FROM clients WHERE id = ? AND user_id = ?');
  return stmt.get(id, userId);
}

function findClientByDocument(userId, document) {
  const stmt = db.prepare('SELECT * FROM clients WHERE user_id = ? AND document = ?');
  return stmt.get(userId, document);
}

function findClientByEmail(userId, email) {
  const stmt = db.prepare(
    'SELECT * FROM clients WHERE user_id = ? AND lower(email) = lower(?)'
  );
  return stmt.get(userId, email);
}

function updateClient(userId, id, data) {
  const stmt = db.prepare(`
    UPDATE clients
    SET name = ?, document = ?, document_type = ?, phone = ?, email = ?, notes = ?
    WHERE id = ? AND user_id = ?
  `);
  stmt.run(
    data.name,
    data.document || null,
    data.documentType || null,
    data.phone || null,
    data.email || null,
    data.notes || null,
    id,
    userId
  );
  return getClient(userId, id);
}

function deleteClient(userId, id) {
  db.prepare('DELETE FROM projects WHERE client_id = ? AND user_id = ?').run(id, userId);
  const stmt = db.prepare('DELETE FROM clients WHERE id = ? AND user_id = ?');
  const info = stmt.run(id, userId);
  return info.changes > 0;
}

// ---------------------------------------------------------------- projetos

function listProjects(userId) {
  const stmt = db.prepare(`
    SELECT projects.*,
           clients.name AS client_name,
           clients.document AS client_document,
           clients.document_type AS client_document_type,
           clients.phone AS client_phone,
           clients.email AS client_email
    FROM projects
    JOIN clients ON clients.id = projects.client_id
    WHERE projects.user_id = ?
    ORDER BY projects.created_at DESC
  `);
  return stmt.all(userId);
}

function createProject(userId, data) {
  const stmt = db.prepare(`
    INSERT INTO projects (user_id, client_id, name, description, languages, price, deadline, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    userId,
    data.clientId,
    data.name,
    data.description,
    data.languages || null,
    data.price || null,
    data.deadline || null,
    data.status || 'orcamento'
  );
  return getProject(userId, info.lastInsertRowid);
}

function getProject(userId, id) {
  const stmt = db.prepare(`
    SELECT projects.*,
           clients.name AS client_name,
           clients.document AS client_document,
           clients.document_type AS client_document_type,
           clients.phone AS client_phone,
           clients.email AS client_email
    FROM projects
    JOIN clients ON clients.id = projects.client_id
    WHERE projects.id = ? AND projects.user_id = ?
  `);
  return stmt.get(id, userId);
}

function updateProject(userId, id, data) {
  const stmt = db.prepare(`
    UPDATE projects
    SET client_id = ?, name = ?, description = ?, languages = ?, price = ?, deadline = ?, status = ?
    WHERE id = ? AND user_id = ?
  `);
  stmt.run(
    data.clientId,
    data.name,
    data.description,
    data.languages || null,
    data.price || null,
    data.deadline || null,
    data.status || 'orcamento',
    id,
    userId
  );
  return getProject(userId, id);
}

function deleteProject(userId, id) {
  const stmt = db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?');
  const info = stmt.run(id, userId);
  return info.changes > 0;
}

module.exports = {
  db,
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
};
