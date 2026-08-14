async function loadMe() {
  const res = await fetch('/api/me');
  const data = await res.json();
  document.getElementById('userName').textContent = `Bonjour, ${data.name}`;
  return data;
}
