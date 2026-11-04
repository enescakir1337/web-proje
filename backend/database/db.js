const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const dbPath = path.join(__dirname, '66Vizite.db');
const schemaPath = path.join(__dirname, 'schema.sql');
const db = new DatabaseSync(dbPath);

function initDatabase() {
  if (fs.existsSync(schemaPath)) {
    db.exec(fs.readFileSync(schemaPath, 'utf8'));
    console.log('SQLite veritabanı hazır:', dbPath);
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, savedHash, savedSalt) {
  const hash = crypto.pbkdf2Sync(password, savedSalt, 100000, 64, 'sha512').toString('hex');
  return hash === savedHash;
}

function registerUser(fullName, email, password, planTier = 'free') {
  const name = fullName.trim();
  const normalizedEmail = email.toLowerCase().trim();

  if (db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail)) {
    throw new Error('Bu e-posta adresi ile kayıtlı bir hesap zaten var.');
  }

  const { hash, salt } = hashPassword(password);
  const result = db.prepare(`
    INSERT INTO users (full_name, email, password_hash, salt, plan_tier)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, normalizedEmail, hash, salt, planTier);

  return {
    id: result.lastInsertRowid,
    fullName: name,
    email: normalizedEmail,
    planTier
  };
}

function authenticateUser(email, password) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());

  if (!user || !verifyPassword(password, user.password_hash, user.salt)) {
    throw new Error('E-posta adresi veya şifre hatalı.');
  }

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    planTier: user.plan_tier,
    createdAt: user.created_at
  };
}

function getAllUsers() {
  return db.prepare('SELECT id, full_name, email, plan_tier, created_at FROM users ORDER BY id DESC').all();
}

module.exports = {
  db,
  initDatabase,
  registerUser,
  authenticateUser,
  getAllUsers
};
