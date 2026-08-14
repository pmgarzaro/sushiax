let rawData = {}; // { personName: [{ itemName, quantity }, ...] }

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'fr'));
}

function populateFilters() {
  const personSelect = document.getElementById('personFilter');
  const dishSelect = document.getElementById('dishFilter');

  const people = uniqueSorted(Object.keys(rawData));

  const dishesByKey = new Map();
  for (const items of Object.values(rawData)) {
    for (const item of items) {
      const key = item.itemName.toLowerCase();
      if (!dishesByKey.has(key)) {
        dishesByKey.set(key, item.itemName);
      }
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

function getFilteredData() {
  const person = document.getElementById('personFilter').value;
  const dish = document.getElementById('dishFilter').value.toLowerCase();

  const result = {};
  for (const [name, items] of Object.entries(rawData)) {
    if (person && name !== person) {
      continue;
    }
    const filteredItems = dish ? items.filter((item) => item.itemName.toLowerCase() === dish) : items;
    if (filteredItems.length > 0) {
      result[name] = filteredItems;
    }
  }
  return result;
}

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

function renderDetailCards(filtered) {
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
    const items = filtered[name];
    const total = items.reduce((sum, item) => sum + item.quantity, 0);

    const card = document.createElement('div');
    card.className = 'orderCard';

    const heading = document.createElement('h3');
    heading.textContent = `${name} — ${total} plat${total > 1 ? 's' : ''}`;
    card.appendChild(heading);

    const list = document.createElement('ul');
    items
      .slice()
      .sort((a, b) => b.quantity - a.quantity || a.itemName.localeCompare(b.itemName, 'fr'))
      .forEach((item) => {
        const li = document.createElement('li');
        li.textContent = `${item.quantity}× ${item.itemName}`;
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
  for (const [name, items] of Object.entries(filtered)) {
    for (const item of items) {
      const key = item.itemName.toLowerCase();
      if (!dishByKey.has(key)) {
        dishByKey.set(key, { label: item.itemName, total: 0, people: [] });
      }
      const bucket = dishByKey.get(key);
      bucket.total += item.quantity;
      bucket.people.push({ name, quantity: item.quantity });
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

let currentDetailView = 'person';

function renderAll() {
  const filtered = getFilteredData();

  const personEntries = Object.entries(filtered)
    .map(([name, items]) => ({
      label: name,
      value: items.reduce((sum, item) => sum + item.quantity, 0),
      hueClass: 'barFillVermillion',
    }))
    .sort((a, b) => b.value - a.value);

  const dishTotals = new Map();
  for (const items of Object.values(filtered)) {
    for (const item of items) {
      const key = item.itemName.toLowerCase();
      const existing = dishTotals.get(key);
      if (existing) {
        existing.value += item.quantity;
      } else {
        dishTotals.set(key, { label: item.itemName, value: item.quantity, hueClass: 'barFillIndigo' });
      }
    }
  }
  const dishEntries = Array.from(dishTotals.values()).sort((a, b) => b.value - a.value);

  renderBarChart(document.getElementById('personChart'), personEntries);
  renderBarChart(document.getElementById('dishChart'), dishEntries);

  if (currentDetailView === 'dish') {
    renderDetailByDish(filtered);
  } else {
    renderDetailCards(filtered);
  }
}

async function loadStats(scope) {
  const res = await fetch(`/api/stats?scope=${scope}`);
  rawData = await res.json();
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
