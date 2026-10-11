
document.addEventListener('DOMContentLoaded', async () => {
  const counter = document.querySelector('[data-page-id]');
  if (!counter) return;

  const pageId = counter.dataset.pageId;
  const todayEl = document.getElementById('today-visitors');
  const totalEl = document.getElementById('total-visitors');

  if (!todayEl || !totalEl) return;

  try {
    // 같은 탭 세션에서 페이지별로 재사용할 ID
    const key = 'visitor-session-id';
    let sessionId = sessionStorage.getItem(key);

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(key, sessionId);
    }

    const response = await fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId, sessionId }),
      cache: 'no-store'
    });

    if (!response.ok) throw new Error('API error');

    const data = await response.json();

    todayEl.textContent = data.today.toLocaleString('ko-KR');
    totalEl.textContent = data.total.toLocaleString('ko-KR');
  } catch (error) {
    console.error('방문객 카운터 오류:', error);
    todayEl.textContent = '-';
    totalEl.textContent = '-';
  }
});
