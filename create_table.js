async function loadOrders() {
  const response = await fetch('/api/orders');
  const orders = await response.json();

  const tablesContainer = document.getElementById('tablesContainer');
  tablesContainer.innerHTML = '';

  const names = Object.keys(orders);

  if (names.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Aucune commande pour le moment.';
    tablesContainer.appendChild(empty);
    return;
  }

  for (const name of names) {
    const table = document.createElement('table');

    const headerRow = document.createElement('tr');
    const headerCell = document.createElement('th');
    headerCell.textContent = name;
    headerRow.appendChild(headerCell);
    table.appendChild(headerRow);

    for (const order of orders[name]) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.textContent = order;
      row.appendChild(cell);
      table.appendChild(row);
    }

    tablesContainer.appendChild(table);
  }
}

const clearButton = document.getElementById('clearButton');
clearButton.addEventListener('click', async function clearOrders() {
  await fetch('/clear', { method: 'POST' });
  loadOrders();
});

loadOrders();
