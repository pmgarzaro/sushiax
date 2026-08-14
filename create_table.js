async function loadOrders() {
  const response = await fetch('/api/orders');
  const orders = await response.json();

  const ordersContainer = document.getElementById('ordersContainer');
  const summary = document.getElementById('summary');
  ordersContainer.innerHTML = '';

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

  for (const name of names) {
    const card = document.createElement('div');
    card.className = 'orderCard';

    const heading = document.createElement('h2');
    heading.textContent = name;
    card.appendChild(heading);

    const list = document.createElement('ul');
    orders[name].forEach((order, index) => {
      const item = document.createElement('li');

      const label = document.createElement('span');
      label.textContent = order;
      item.appendChild(label);

      const deleteButton = document.createElement('button');
      deleteButton.className = 'deleteItem';
      deleteButton.type = 'button';
      deleteButton.setAttribute('aria-label', `Supprimer la commande "${order}" de ${name}`);
      deleteButton.textContent = '×';
      deleteButton.addEventListener('click', async () => {
        await fetch(`/api/orders/${encodeURIComponent(name)}/${index}`, { method: 'DELETE' });
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
