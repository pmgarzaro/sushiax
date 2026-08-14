const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SECRET_FILE = path.join(__dirname, '..', 'data', 'session-secret.txt');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const suppliedBuffer = crypto.scryptSync(password, salt, 64);
  return hashBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(hashBuffer, suppliedBuffer);
}

function getSessionSecret() {
  try {
    return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  } catch (err) {
    const secret = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    fs.writeFileSync(SECRET_FILE, secret);
    return secret;
  }
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    return res.redirect('/login');
  }
  next();
}

function redirectIfAuthed(req, res, next) {
  if (req.session.userId) {
    return res.redirect('/');
  }
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  getSessionSecret,
  requireAuth,
  redirectIfAuthed,
};
