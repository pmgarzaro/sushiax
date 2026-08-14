let me = null;

async function loadItems() {
  const res = await fetch('/api/items');
  const items = await res.json();
  const datalist = document.getElementById('itemsList');
  datalist.innerHTML = '';
  for (const name of items) {
    const option = document.createElement('option');
    option.value = name;
    datalist.appendChild(option);
  }
}

function groupByItem(orders) {
  const map = new Map();
  for (const order of orders) {
    const key = order.itemName.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, { text: order.itemName, quantity: 0, orderIds: [] });
    }
    const group = map.get(key);
    group.quantity += order.quantity;
    group.orderIds.push(order.id);
  }
  return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity || a.text.localeCompare(b.text, 'fr'));
}

async function loadOrders() {
  const res = await fetch('/api/orders/today');
  const orders = await res.json();

  const summary = document.getElementById('summary');
  const totalContainer = document.getElementById('totalContainer');
  const peopleContainer = document.getElementById('peopleContainer');
  totalContainer.innerHTML = '';
  peopleContainer.innerHTML = '';

  if (orders.length === 0) {
    summary.textContent = '';
    peopleContainer.innerHTML = '<p class="emptyState">Aucune commande pour le moment aujourd\'hui.</p>';
    return;
  }

  const names = [...new Set(orders.map((o) => o.userName))];
  const totalItems = orders.reduce((sum, o) => sum + o.quantity, 0);
  summary.textContent = `${names.length} personne${names.length > 1 ? 's' : ''} · ${totalItems} plat${totalItems > 1 ? 's' : ''}`;

  const totalHeading = document.createElement('h2');
  totalHeading.textContent = 'Total à commander';
  totalContainer.appendChild(totalHeading);

  const totalList = document.createElement('ul');
  groupByItem(orders).forEach((group) => {
    const item = document.createElement('li');
    item.textContent = `${group.quantity}× ${group.text}`;
    totalList.appendChild(item);
  });
  totalContainer.appendChild(totalList);

  for (const name of names) {
    const personOrders = orders.filter((o) => o.userName === name);
    const card = document.createElement('div');
    card.className = 'orderCard';

    const heading = document.createElement('h3');
    heading.textContent = name;
    card.appendChild(heading);

    const list = document.createElement('ul');
    groupByItem(personOrders).forEach((group) => {
      const item = document.createElement('li');

      const label = document.createElement('span');
      label.textContent = `${group.quantity}× ${group.text}`;
      item.appendChild(label);

      if (me && name === me.name) {
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'deleteItem';
        deleteButton.textContent = '×';
        deleteButton.setAttribute('aria-label', `Retirer une commande "${group.text}"`);
        deleteButton.addEventListener('click', async () => {
          const orderId = group.orderIds[group.orderIds.length - 1];
          await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
          loadOrders();
        });
        item.appendChild(deleteButton);
      }

      list.appendChild(item);
    });
    card.appendChild(list);

    peopleContainer.appendChild(card);
  }
}

const orderForm = document.getElementById('orderForm');
orderForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const itemName = document.getElementById('itemName').value.trim();
  const quantity = parseInt(document.getElementById('quantity').value, 10);
  if (!itemName || !quantity) {
    return;
  }

  await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemName, quantity }),
  });

  orderForm.reset();
  document.getElementById('quantity').value = 1;
  await loadItems();
  await loadOrders();
});

(async () => {
  me = await loadMe();
  await loadItems();
  await loadOrders();
})();
