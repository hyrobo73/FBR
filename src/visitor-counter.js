
async function loadVisitorCounter() {
    const todayElement = document.getElementById('today-visitors');
    const totalElement = document.getElementById('total-visitors');

    if (!todayElement || !totalElement) return;

    try {
        let sessionId = sessionStorage.getItem('visitor-session-id');

        if (!sessionId) {
            sessionId = crypto.randomUUID();
            sessionStorage.setItem('visitor-session-id', sessionId);
        }

        const response = await fetch('/api/visit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionId }),
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        todayElement.textContent =
            Number(data.today).toLocaleString('ko-KR');

        totalElement.textContent =
            Number(data.total).toLocaleString('ko-KR');
    } catch (error) {
        console.error('방문객 카운터 오류:', error);

        todayElement.textContent = '-';
        totalElement.textContent = '-';
    }
}

document.addEventListener('DOMContentLoaded', loadVisitorCounter);
