const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function emptyDb() {
  return {
    nextUserId: 1,
    nextItemId: 1,
    nextOrderId: 1,
    users: [],
    items: [],
    orders: [],
  };
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    return emptyDb();
  }
}

let db = load();

function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// --- Users ---

function findUserByName(name) {
  const key = name.trim().toLowerCase();
  return db.users.find((u) => u.name.toLowerCase() === key) || null;
}

function findUserById(id) {
  return db.users.find((u) => u.id === id) || null;
}

function createUser(name, passwordHash) {
  const user = {
    id: db.nextUserId++,
    name: name.trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  save();
  return user;
}

// --- Items catalog ---

function listItemNames() {
  return db.items.map((i) => i.name).sort((a, b) => a.localeCompare(b, 'fr'));
}

function ensureItem(name) {
  const key = name.trim().toLowerCase();
  const existing = db.items.find((i) => i.name.toLowerCase() === key);
  if (existing) {
    return existing;
  }
  const item = { id: db.nextItemId++, name: name.trim() };
  db.items.push(item);
  return item;
}

// --- Orders ---

function addOrder(userId, userName, itemName, quantity) {
  ensureItem(itemName);
  const order = {
    id: db.nextOrderId++,
    userId,
    userName,
    itemName: itemName.trim(),
    quantity,
    date: todayStr(),
    createdAt: new Date().toISOString(),
  };
  db.orders.push(order);
  save();
  return order;
}

function deleteOrder(orderId, userId) {
  const index = db.orders.findIndex((o) => o.id === orderId);
  if (index === -1) {
    return { ok: false, status: 404 };
  }
  if (db.orders[index].userId !== userId) {
    return { ok: false, status: 403 };
  }
  db.orders.splice(index, 1);
  save();
  return { ok: true };
}

function ordersForDate(date) {
  return db.orders.filter((o) => o.date === date);
}

function ordersInRange(fromDate, toDate) {
  return db.orders.filter((o) => o.date >= fromDate && o.date <= toDate);
}

module.exports = {
  todayStr,
  findUserByName,
  findUserById,
  createUser,
  listItemNames,
  addOrder,
  deleteOrder,
  ordersForDate,
  ordersInRange,
};
