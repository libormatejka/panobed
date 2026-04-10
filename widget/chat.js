(function () {
  const API_URL = '/api/chat';

  const messagesEl = document.getElementById('chat-messages');
  const inputEl    = document.getElementById('chat-input');
  const sendBtn    = document.getElementById('chat-send');

  let conversationHistory = [];

  // Uvítací zpráva
  appendMessage('bot', 'Ahoj! Jsem Pan Oběd. 👋 Řekni mi město a já ti najdu dnešní menu. Třeba: <em>„Co mají dnes v Pardubicích?"</em>');

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    setLoading(true);
    appendMessage('user', escapeHtml(text));

    try {
      const res  = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, history: conversationHistory }),
      });
      const data = await res.json();
      if (data.history) conversationHistory = data.history;
      appendMessage('bot', formatReply(data.reply || data.error || 'Něco se pokazilo.'));
    } catch {
      appendMessage('bot', 'Nepodařilo se spojit se serverem.');
    } finally {
      setLoading(false);
    }
  }

  function appendMessage(role, html) {
    const wrap = document.createElement('div');
    wrap.className = `message ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = html;

    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setLoading(active) {
    sendBtn.disabled  = active;
    inputEl.disabled  = active;
    sendBtn.textContent = active ? '…' : 'Odeslat';

    // Přidej/odstraň typing indicator
    const existing = document.getElementById('typing');
    if (active && !existing) {
      const el = document.createElement('div');
      el.id = 'typing';
      el.className = 'message bot';
      el.innerHTML = '<div class="bubble typing-dots"><span></span><span></span><span></span></div>';
      messagesEl.appendChild(el);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } else if (!active && existing) {
      existing.remove();
    }
  }

  // Markdown-lite: **tučné**, nové řádky → <br>
  function formatReply(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
