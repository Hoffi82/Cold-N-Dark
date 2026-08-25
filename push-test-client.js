/* Cold N' Dark – echter Server-Push-Test */
(function () {
  const pushCard = document.querySelector('.push');
  if (!pushCard || !window.CND_PUSH) return;

  const oldButton = document.getElementById('pushTestBtn');
  if (oldButton) return;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center';

  const button = document.createElement('button');
  button.id = 'pushTestBtn';
  button.type = 'button';
  button.textContent = '🧪 Test-Push senden';
  button.style.cssText = 'border:1px solid #ffc43d66;border-radius:13px;background:#ffffff08;color:#ffc43d;font-weight:900;padding:11px 14px;cursor:pointer';

  const result = document.createElement('span');
  result.id = 'pushTestResult';
  result.style.cssText = 'font-size:12px;color:#b9b2c9';
  result.textContent = 'Server-Test bereit';

  wrap.append(button, result);
  pushCard.appendChild(wrap);

  button.addEventListener('click', async () => {
    button.disabled = true;
    result.textContent = '⏳ Push wird gesendet …';
    try {
      const status = await CND_PUSH.status();
      if (!status.subscription) {
        throw new Error('Kein Push-Abonnement gefunden. Bitte zuerst „Aktivieren“ drücken.');
      }

      const response = await fetch('https://jvgqvtnqncelbhuordzy.supabase.co/functions/v1/push-test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(status.subscription.toJSON())
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Push-Server hat die Nachricht nicht angenommen.');
      }

      result.style.color = '#45d483';
      result.textContent = '✅ Server-Push wurde gesendet!';
    } catch (error) {
      result.style.color = '#ffb4b4';
      result.textContent = '❌ ' + (error?.message || 'Push-Test fehlgeschlagen.');
    } finally {
      button.disabled = false;
    }
  });
})();
