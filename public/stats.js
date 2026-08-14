async function loadStats(scope) {
  const res = await fetch(`/api/stats?scope=${scope}`);
  const data = await res.json();
  const container = document.getElementById('statsContainer');
  container.innerHTML = '';

  const names = Object.keys(data).sort((a, b) => a.localeCompare(b, 'fr'));

  if (names.length === 0) {
    container.innerHTML = '<p class="emptyState">Aucune commande enregistrée sur cette période.</p>';
    return;
  }

  for (const name of names) {
    const items = data[name];
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

const tabButtons = document.querySelectorAll('.tabBtn');
tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabButtons.forEach((b) => b.classList.remove('tabBtnActive'));
    btn.classList.add('tabBtnActive');
    loadStats(btn.dataset.scope);
  });
});

(async () => {
  await loadMe();
  await loadStats('month');
})();
