const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const DONUT_COLOR_CLASSES = ['donutColor1', 'donutColor2', 'donutColor3', 'donutColor4', 'donutColor5'];

let rawOrders = []; // [{ userName, itemName, quantity, date }, ...]
let currentScope = 'month';
let currentDetailView = 'person';

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'fr'));
}

function formatDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function groupByItemName(orders) {
  const map = new Map();
  for (const order of orders) {
    const key = order.itemName.trim().toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.value += order.quantity;
    } else {
      map.set(key, { label: order.itemName, value: order.quantity });
    }
  }
  return map;
}

// --- Filtres ---

function populateFilters() {
  const personSelect = document.getElementById('personFilter');
  const dishSelect = document.getElementById('dishFilter');

  const people = uniqueSorted(rawOrders.map((o) => o.userName));
  const dishesByKey = new Map();
  for (const order of rawOrders) {
    const key = order.itemName.toLowerCase();
    if (!dishesByKey.has(key)) {
      dishesByKey.set(key, order.itemName);
    }
  }
  const dishes = Array.from(dishesByKey.values()).sort((a, b) => a.localeCompare(b, 'fr'));

  const previousPerson = personSelect.value;
  const previousDish = dishSelect.value;

  personSelect.innerHTML = '';
  personSelect.appendChild(new Option('Toutes les personnes', ''));
  for (const name of people) {
    personSelect.appendChild(new Option(name, name));
  }

  dishSelect.innerHTML = '';
  dishSelect.appendChild(new Option('Tous les plats', ''));
  for (const name of dishes) {
    dishSelect.appendChild(new Option(name, name));
  }

  if (people.includes(previousPerson)) {
    personSelect.value = previousPerson;
  }
  if (dishes.includes(previousDish)) {
    dishSelect.value = previousDish;
  }
}

function getFilteredOrders() {
  const person = document.getElementById('personFilter').value;
  const dish = document.getElementById('dishFilter').value.toLowerCase();

  return rawOrders.filter((order) => {
    if (person && order.userName !== person) {
      return false;
    }
    if (dish && order.itemName.toLowerCase() !== dish) {
      return false;
    }
    return true;
  });
}

function groupByPerson(orders) {
  const byPerson = {};
  for (const order of orders) {
    if (!byPerson[order.userName]) {
      byPerson[order.userName] = [];
    }
    byPerson[order.userName].push(order);
  }
  return byPerson;
}

// --- Barres (qui a le plus mangé / plats les plus commandés) ---

function renderBarChart(container, entries) {
  container.innerHTML = '';

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'emptyState';
    empty.textContent = 'Aucune donnée sur cette période.';
    container.appendChild(empty);
    return;
  }

  const max = Math.max(...entries.map((entry) => entry.value));

  for (const entry of entries) {
    const row = document.createElement('div');
    row.className = 'barRow';
    row.tabIndex = 0;
    row.title = `${entry.label} : ${entry.value}`;

    const label = document.createElement('span');
    label.className = 'barLabel';
    label.textContent = entry.label;
    row.appendChild(label);

    const track = document.createElement('div');
    track.className = 'barTrack';
    const fill = document.createElement('div');
    fill.className = `barFill ${entry.hueClass}`;
    fill.style.width = `${max > 0 ? (entry.value / max) * 100 : 0}%`;
    track.appendChild(fill);
    row.appendChild(track);

    const value = document.createElement('span');
    value.className = 'barValue';
    value.textContent = entry.value;
    row.appendChild(value);

    container.appendChild(row);
  }
}

// --- Indicateurs (KPI) ---

function renderKpis(orders) {
  const container = document.getElementById('kpiRow');
  container.innerHTML = '';

  const totalItems = orders.reduce((sum, o) => sum + o.quantity, 0);
  const people = new Set(orders.map((o) => o.userName));
  const days = new Set(orders.map((o) => o.date));
  const dishTotals = groupByItemName(orders);

  let topDish = null;
  for (const entry of dishTotals.values()) {
    if (!topDish || entry.value > topDish.value) {
      topDish = entry;
    }
  }

  const avgPerPerson = people.size > 0 ? totalItems / people.size : 0;
  const avgLabel = Number.isInteger(avgPerPerson) ? String(avgPerPerson) : avgPerPerson.toFixed(1);

  const tiles = [
    { value: String(totalItems), label: 'Plats commandés' },
    { value: avgLabel, label: 'Moyenne / personne' },
    { value: topDish ? topDish.label : '—', label: 'Plat n°1' },
    { value: String(days.size), label: 'Jours de commande' },
  ];

  for (const tile of tiles) {
    const el = document.createElement('div');
    el.className = 'kpiTile';

    const value = document.createElement('span');
    value.className = 'kpiValue';
    value.textContent = tile.value;
    value.title = tile.value;
    el.appendChild(value);

    const label = document.createElement('span');
    label.className = 'kpiLabel';
    label.textContent = tile.label;
    el.appendChild(label);

    container.appendChild(el);
  }
}

// --- Évolution (colonnes) ---

function computeEvolution(orders, scope) {
  const now = new Date();

  if (scope === 'year') {
    const buckets = MONTH_LABELS.map((label) => ({ label, value: 0 }));
    for (const order of orders) {
      const monthIndex = parseInt(order.date.slice(5, 7), 10) - 1;
      if (buckets[monthIndex]) {
        buckets[monthIndex].value += order.quantity;
      }
    }
    return buckets;
  }

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const buckets = Array.from({ length: daysInMonth }, (_, i) => ({ label: String(i + 1), value: 0 }));
  for (const order of orders) {
    const dayIndex = parseInt(order.date.slice(8, 10), 10) - 1;
    if (buckets[dayIndex]) {
      buckets[dayIndex].value += order.quantity;
    }
  }
  return buckets;
}

function renderEvolution(orders) {
  const container = document.getElementById('evolutionChart');
  const hint = document.getElementById('evolutionHint');
  container.innerHTML = '';

  const buckets = computeEvolution(orders, currentScope);
  hint.textContent = currentScope === 'year' ? '(par mois)' : '(par jour)';

  if (orders.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'emptyState';
    empty.textContent = 'Aucune donnée sur cette période.';
    container.appendChild(empty);
    return;
  }

  const max = Math.max(...buckets.map((b) => b.value), 1);
  const showEveryLabel = currentScope === 'year';

  const bars = document.createElement('div');
  bars.className = 'evolutionBars';

  const labels = document.createElement('div');
  labels.className = 'evolutionLabels';

  buckets.forEach((bucket, index) => {
    const col = document.createElement('div');
    col.className = 'evoCol';
    col.tabIndex = 0;
    col.title = `${currentScope === 'year' ? bucket.label : `Jour ${bucket.label}`} : ${bucket.value}`;

    const fill = document.createElement('div');
    fill.className = 'evoColFill';
    fill.style.height = `${(bucket.value / max) * 100}%`;

    if (bucket.value === max && bucket.value > 0) {
      const peak = document.createElement('span');
      peak.className = 'evoColPeak';
      peak.textContent = bucket.value;
      fill.appendChild(peak);
    }

    col.appendChild(fill);
    bars.appendChild(col);

    const labelEl = document.createElement('span');
    const dayNum = index + 1;
    const showDayLabel = showEveryLabel || dayNum === 1 || dayNum === buckets.length || dayNum % 5 === 0;
    labelEl.textContent = showDayLabel ? bucket.label : '';
    labels.appendChild(labelEl);
  });

  container.appendChild(bars);
  container.appendChild(labels);
}

// --- Donut « part de la carte » ---

function renderDonut(orders) {
  const container = document.getElementById('donutChart');
  container.innerHTML = '';

  const dishTotals = Array.from(groupByItemName(orders).values()).sort((a, b) => b.value - a.value);
  const total = dishTotals.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    const empty = document.createElement('p');
    empty.className = 'emptyState';
    empty.textContent = 'Aucune donnée sur cette période.';
    container.appendChild(empty);
    return;
  }

  const top = dishTotals.slice(0, 5).map((d, i) => ({ ...d, colorClass: DONUT_COLOR_CLASSES[i] }));
  const restTotal = dishTotals.slice(5).reduce((sum, d) => sum + d.value, 0);
  const segments = restTotal > 0 ? [...top, { label: 'Autres', value: restTotal, colorClass: 'donutColorOther' }] : top;

  let cumulative = 0;
  const stops = segments.map((segment) => {
    const start = (cumulative / total) * 360;
    cumulative += segment.value;
    const end = (cumulative / total) * 360;
    return `var(--${segment.colorClass}) ${start}deg ${end}deg`;
  });

  const ring = document.createElement('div');
  ring.className = 'donutRing';
  ring.style.background = `conic-gradient(${stops.join(', ')})`;
  container.appendChild(ring);

  const legend = document.createElement('ul');
  legend.className = 'donutLegend';
  for (const segment of segments) {
    const li = document.createElement('li');

    const dot = document.createElement('span');
    dot.className = `donutDot ${segment.colorClass}`;
    li.appendChild(dot);

    const text = document.createElement('span');
    const pct = Math.round((segment.value / total) * 100);
    text.textContent = `${segment.label} — ${pct}% (${segment.value})`;
    li.appendChild(text);

    legend.appendChild(li);
  }
  container.appendChild(legend);
}

// --- Records ---

function renderRecords(orders) {
  const list = document.getElementById('recordsList');
  list.innerHTML = '';

  if (orders.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'emptyState';
    empty.textContent = 'Aucune donnée sur cette période.';
    list.appendChild(empty);
    return;
  }

  const byDate = new Map();
  for (const order of orders) {
    byDate.set(order.date, (byDate.get(order.date) || 0) + order.quantity);
  }
  let bestDay = null;
  for (const [date, quantity] of byDate) {
    if (!bestDay || quantity > bestDay.quantity) {
      bestDay = { date, quantity };
    }
  }

  const byPerson = new Map();
  for (const order of orders) {
    byPerson.set(order.userName, (byPerson.get(order.userName) || 0) + order.quantity);
  }
  let topEater = null;
  for (const [name, quantity] of byPerson) {
    if (!topEater || quantity > topEater.quantity) {
      topEater = { name, quantity };
    }
  }

  let biggestOrder = null;
  for (const order of orders) {
    if (!biggestOrder || order.quantity > biggestOrder.quantity) {
      biggestOrder = order;
    }
  }

  const records = [
    { emoji: '🏆', text: `Jour recordman : ${formatDate(bestDay.date)} — ${bestDay.quantity} plats` },
    { emoji: '😋', text: `Plus gros appétit : ${topEater.name} — ${topEater.quantity} plats` },
    { emoji: '🍣', text: `Plus grosse commande d'un coup : ${biggestOrder.quantity}× ${biggestOrder.itemName} (${biggestOrder.userName})` },
  ];

  for (const record of records) {
    const li = document.createElement('li');

    const emoji = document.createElement('span');
    emoji.className = 'recordEmoji';
    emoji.textContent = record.emoji;
    li.appendChild(emoji);

    const text = document.createElement('span');
    text.textContent = record.text;
    li.appendChild(text);

    list.appendChild(li);
  }
}

// --- Détail (par personne / par plat / tableau croisé) ---

function renderDetailByPerson(filtered) {
  const container = document.getElementById('statsContainer');
  container.innerHTML = '';

  const names = Object.keys(filtered).sort((a, b) => a.localeCompare(b, 'fr'));

  if (names.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'emptyState';
    empty.textContent = 'Aucune commande enregistrée sur cette période.';
    container.appendChild(empty);
    return;
  }

  for (const name of names) {
    const items = Array.from(groupByItemName(filtered[name]).values());
    const total = items.reduce((sum, item) => sum + item.value, 0);

    const card = document.createElement('div');
    card.className = 'orderCard';

    const heading = document.createElement('h3');
    heading.textContent = `${name} — ${total} plat${total > 1 ? 's' : ''}`;
    card.appendChild(heading);

    const list = document.createElement('ul');
    items
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'fr'))
      .forEach((item) => {
        const li = document.createElement('li');
        li.textContent = `${item.value}× ${item.label}`;
        list.appendChild(li);
      });
    card.appendChild(list);

    container.appendChild(card);
  }
}

function renderDetailByDish(filtered) {
  const container = document.getElementById('statsContainer');
  container.innerHTML = '';

  const dishByKey = new Map();
  for (const [name, orders] of Object.entries(filtered)) {
    for (const order of orders) {
      const key = order.itemName.toLowerCase();
      if (!dishByKey.has(key)) {
        dishByKey.set(key, { label: order.itemName, total: 0, people: [] });
      }
      const bucket = dishByKey.get(key);
      bucket.total += order.quantity;
      bucket.people.push({ name, quantity: order.quantity });
    }
  }

  const dishes = Array.from(dishByKey.values()).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'fr'));

  if (dishes.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'emptyState';
    empty.textContent = 'Aucune commande enregistrée sur cette période.';
    container.appendChild(empty);
    return;
  }

  for (const dish of dishes) {
    const card = document.createElement('div');
    card.className = 'orderCard';

    const heading = document.createElement('h3');
    heading.textContent = `${dish.label} — ${dish.total} au total`;
    card.appendChild(heading);

    const list = document.createElement('ul');
    dish.people
      .slice()
      .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'fr'))
      .forEach((entry) => {
        const li = document.createElement('li');
        li.textContent = `${entry.quantity}× ${entry.name}`;
        list.appendChild(li);
      });
    card.appendChild(list);

    container.appendChild(card);
  }
}

function renderDetailTable(filtered) {
  const container = document.getElementById('statsContainer');
  container.innerHTML = '';

  const names = Object.keys(filtered).sort((a, b) => a.localeCompare(b, 'fr'));
  const dishByKey = new Map();
  for (const orders of Object.values(filtered)) {
    for (const order of orders) {
      const key = order.itemName.toLowerCase();
      if (!dishByKey.has(key)) {
        dishByKey.set(key, order.itemName);
      }
    }
  }
  const dishes = Array.from(dishByKey.entries()).sort((a, b) => a[1].localeCompare(b[1], 'fr'));

  if (names.length === 0 || dishes.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'emptyState';
    empty.textContent = 'Aucune commande enregistrée sur cette période.';
    container.appendChild(empty);
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'tableScroll';

  const table = document.createElement('table');
  table.className = 'pivotTable';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.appendChild(document.createElement('th'));
  for (const [, label] of dishes) {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  }
  const totalHeadTh = document.createElement('th');
  totalHeadTh.textContent = 'Total';
  headRow.appendChild(totalHeadTh);
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const name of names) {
    const row = document.createElement('tr');

    const nameTh = document.createElement('th');
    nameTh.scope = 'row';
    nameTh.textContent = name;
    row.appendChild(nameTh);

    const quantityByKey = new Map();
    for (const order of filtered[name]) {
      const key = order.itemName.toLowerCase();
      quantityByKey.set(key, (quantityByKey.get(key) || 0) + order.quantity);
    }

    let rowTotal = 0;
    for (const [key] of dishes) {
      const quantity = quantityByKey.get(key) || 0;
      rowTotal += quantity;
      const td = document.createElement('td');
      td.textContent = quantity > 0 ? String(quantity) : '–';
      if (quantity === 0) {
        td.className = 'pivotZero';
      }
      row.appendChild(td);
    }

    const totalTd = document.createElement('td');
    totalTd.className = 'pivotTotal';
    totalTd.textContent = String(rowTotal);
    row.appendChild(totalTd);

    tbody.appendChild(row);
  }
  table.appendChild(tbody);

  wrapper.appendChild(table);
  container.appendChild(wrapper);
}

// --- Orchestration ---

function renderAll() {
  const filteredOrders = getFilteredOrders();
  const filteredByPerson = groupByPerson(filteredOrders);

  renderKpis(filteredOrders);

  const personEntries = Object.entries(filteredByPerson)
    .map(([name, orders]) => ({
      label: name,
      value: orders.reduce((sum, o) => sum + o.quantity, 0),
      hueClass: 'barFillVermillion',
    }))
    .sort((a, b) => b.value - a.value);

  const dishEntries = Array.from(groupByItemName(filteredOrders).values())
    .map((entry) => ({ ...entry, hueClass: 'barFillIndigo' }))
    .sort((a, b) => b.value - a.value);

  renderBarChart(document.getElementById('personChart'), personEntries);
  renderBarChart(document.getElementById('dishChart'), dishEntries);
  renderEvolution(filteredOrders);
  renderDonut(filteredOrders);
  renderRecords(filteredOrders);

  if (currentDetailView === 'dish') {
    renderDetailByDish(filteredByPerson);
  } else if (currentDetailView === 'table') {
    renderDetailTable(filteredByPerson);
  } else {
    renderDetailByPerson(filteredByPerson);
  }
}

async function loadStats(scope) {
  currentScope = scope;
  const res = await fetch(`/api/stats?scope=${scope}`);
  const data = await res.json();
  rawOrders = data.orders;
  populateFilters();
  renderAll();
}

const scopeTabButtons = document.querySelectorAll('#scopeTabs .tabBtn');
scopeTabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    scopeTabButtons.forEach((b) => b.classList.remove('tabBtnActive'));
    btn.classList.add('tabBtnActive');
    loadStats(btn.dataset.scope);
  });
});

const viewTabButtons = document.querySelectorAll('#viewTabs .tabBtn');
viewTabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    viewTabButtons.forEach((b) => b.classList.remove('tabBtnActive'));
    btn.classList.add('tabBtnActive');
    currentDetailView = btn.dataset.view;
    renderAll();
  });
});

document.getElementById('personFilter').addEventListener('change', renderAll);
document.getElementById('dishFilter').addEventListener('change', renderAll);

(async () => {
  await loadMe();
  await loadStats('month');
})();
