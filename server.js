const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./lib/db');
const { hashPassword, verifyPassword, getSessionSecret, requireAuth, redirectIfAuthed } = require('./lib/auth');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
  },
}));

app.use('/public', express.static(path.join(__dirname, 'public')));

// --- Pages d'authentification ---

app.get('/login', redirectIfAuthed, (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup', redirectIfAuthed, (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

app.post('/signup', (req, res) => {
  const name = (req.body.name || '').trim();
  const password = req.body.password || '';

  if (name.length < 2) {
    return res.redirect('/signup?error=' + encodeURIComponent('Le nom doit faire au moins 2 caractères.'));
  }
  if (password.length < 6) {
    return res.redirect('/signup?error=' + encodeURIComponent('Le mot de passe doit faire au moins 6 caractères.'));
  }
  if (db.findUserByName(name)) {
    return res.redirect('/signup?error=' + encodeURIComponent('Ce nom est déjà utilisé.'));
  }

  const user = db.createUser(name, hashPassword(password));
  req.session.userId = user.id;
  req.session.userName = user.name;
  res.redirect('/');
});

app.post('/login', (req, res) => {
  const name = (req.body.name || '').trim();
  const password = req.body.password || '';

  const user = db.findUserByName(name);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.redirect('/login?error=' + encodeURIComponent('Nom ou mot de passe incorrect.'));
  }

  req.session.userId = user.id;
  req.session.userName = user.name;
  res.redirect('/');
});

app.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// --- Pages protégées ---

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/stats', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'stats.html'));
});

// --- API ---

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ id: req.session.userId, name: req.session.userName });
});

app.get('/api/items', requireAuth, (req, res) => {
  res.json(db.listItemNames());
});

app.get('/api/orders/today', requireAuth, (req, res) => {
  res.json(db.ordersForDate(db.todayStr()));
});

app.post('/api/orders', requireAuth, (req, res) => {
  const itemName = (req.body.itemName || '').trim();
  const quantity = parseInt(req.body.quantity, 10);

  if (!itemName || itemName.length > 100) {
    return res.status(400).json({ error: 'Plat invalide.' });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return res.status(400).json({ error: 'Quantité invalide.' });
  }

  const order = db.addOrder(req.session.userId, req.session.userName, itemName, quantity);
  res.status(201).json(order);
});

app.delete('/api/orders/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = db.deleteOrder(id, req.session.userId);

  if (!result.ok) {
    const message = result.status === 403 ? 'Tu ne peux supprimer que tes propres commandes.' : 'Commande introuvable.';
    return res.status(result.status).json({ error: message });
  }
  res.status(204).end();
});

app.get('/api/stats', requireAuth, (req, res) => {
  const scope = req.query.scope === 'year' ? 'year' : 'month';
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const from = scope === 'year' ? `${year}-01-01` : `${year}-${month}-01`;
  const to = scope === 'year' ? `${year}-12-31` : `${year}-${month}-31`;

  const orders = db.ordersInRange(from, to);
  const byUser = {};
  for (const order of orders) {
    if (!byUser[order.userName]) {
      byUser[order.userName] = new Map();
    }
    const key = order.itemName.trim().toLowerCase();
    const bucket = byUser[order.userName];
    if (!bucket.has(key)) {
      bucket.set(key, { itemName: order.itemName, quantity: 0 });
    }
    bucket.get(key).quantity += order.quantity;
  }

  const result = {};
  for (const [userName, bucket] of Object.entries(byUser)) {
    result[userName] = Array.from(bucket.values());
  }
  res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
