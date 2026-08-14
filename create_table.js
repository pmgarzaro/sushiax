function groupOrderItems(orderList) {
  const groups = [];
  const groupByKey = new Map();

  orderList.forEach((order, index) => {
    const key = order.trim().toLowerCase();
    let group = groupByKey.get(key);
    if (!group) {
      group = { text: order, count: 0, indices: [] };
      groupByKey.set(key, group);
      groups.push(group);
    }
    group.count += 1;
    group.indices.push(index);
  });

  return groups;
}

async function loadOrders() {
  const response = await fetch('/api/orders');
  const orders = await response.json();

  const ordersContainer = document.getElementById('ordersContainer');
  const totalContainer = document.getElementById('totalContainer');
  const summary = document.getElementById('summary');
  ordersContainer.innerHTML = '';
  totalContainer.innerHTML = '';

  const names = Object.keys(orders);
  const totalItems = names.reduce((sum, name) => sum + orders[name].length, 0);

  if (names.length === 0) {
    summary.textContent = '';
    const empty = document.createElement('p');
    empty.textContent = 'Aucune commande pour le moment.';
    ordersContainer.appendChild(empty);
    return;
  }

  summary.textContent = `${names.length} personne${names.length > 1 ? 's' : ''} · ${totalItems} plat${totalItems > 1 ? 's' : ''}`;

  // Récapitulatif global : quantité totale par plat, tous participants confondus
  const allOrders = names.flatMap((name) => orders[name]);
  const totalGroups = groupOrderItems(allOrders);

  const totalHeading = document.createElement('h2');
  totalHeading.textContent = 'Total à commander';
  totalContainer.appendChild(totalHeading);

  const totalList = document.createElement('ul');
  totalGroups.forEach((group) => {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${group.count}× ${group.text}`;
    item.appendChild(label);
    totalList.appendChild(item);
  });
  totalContainer.appendChild(totalList);

  for (const name of names) {
    const card = document.createElement('div');
    card.className = 'orderCard';

    const heading = document.createElement('h2');
    heading.textContent = name;
    card.appendChild(heading);

    const list = document.createElement('ul');
    const groups = groupOrderItems(orders[name]);
    groups.forEach((group) => {
      const item = document.createElement('li');

      const label = document.createElement('span');
      label.textContent = group.count > 1 ? `${group.count}× ${group.text}` : group.text;
      item.appendChild(label);

      const deleteButton = document.createElement('button');
      deleteButton.className = 'deleteItem';
      deleteButton.type = 'button';
      deleteButton.setAttribute('aria-label', `Retirer une commande "${group.text}" de ${name}`);
      deleteButton.textContent = '×';
      deleteButton.addEventListener('click', async () => {
        const indexToRemove = group.indices[group.indices.length - 1];
        await fetch(`/api/orders/${encodeURIComponent(name)}/${indexToRemove}`, { method: 'DELETE' });
        loadOrders();
      });
      item.appendChild(deleteButton);

      list.appendChild(item);
    });
    card.appendChild(list);

    ordersContainer.appendChild(card);
  }
}

const clearButton = document.getElementById('clearButton');
clearButton.addEventListener('click', async function clearOrders() {
  if (!confirm('Effacer toutes les commandes de tout le monde ?')) {
    return;
  }
  await fetch('/clear', { method: 'POST' });
  loadOrders();
});

loadOrders();
