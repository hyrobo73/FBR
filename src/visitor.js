document.addEventListener('DOMContentLoaded', async () => {
  const today = document.getElementById('today-visitors');
  const total = document.getElementById('total-visitors');
  if (!today || !total) return;

  try {
    const response = await fetch('/api/visit', {
      method: 'POST',
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const counts = await response.json();
    today.textContent = Number(counts.today).toLocaleString('ko-KR');
    total.textContent = Number(counts.total).toLocaleString('ko-KR');
  } catch (error) {
    console.error('Visitor counter error:', error);
    today.textContent = '-';
    total.textContent = '-';
  }
});
