(function () {
  const API_URL = '/api/chat';

  const messagesEl   = document.getElementById('chat-messages');
  const inputEl      = document.getElementById('chat-input');
  const sendBtn      = document.getElementById('chat-send');
  const sidebar      = document.getElementById('sidebar');
  const toggleBtn    = document.getElementById('sidebar-toggle');
  const newChatBtn   = document.getElementById('new-chat-btn');

  let conversationHistory = [];

  // Sidebar toggle (mobil)
  toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));

  // Klik mimo sidebar ho zavře (mobil)
  document.addEventListener('click', e => {
    if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        e.target !== toggleBtn) {
      sidebar.classList.remove('open');
    }
  });

  // Sidebar nav tlačítka
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sidebar.classList.remove('open');
      inputEl.value = btn.dataset.query;
      sendMessage();
    });
  });

  // Nová konverzace
  newChatBtn.addEventListener('click', () => {
    conversationHistory = [];
    messagesEl.innerHTML = '';
    sidebar.classList.remove('open');
    initWelcome();
  });

  function initWelcome() {
    appendMessage('bot', 'Ahoj! Jsem Pan Oběd. 👋 Řekni mi město a já ti najdu dnešní menu.');
    appendQuickReplies([
      'Pardubice dnes',
      'Pardubice zítra',
      'Nejlevnější oběd v Pardubicích',
      'Co doporučuješ?',
    ]);
  }

  initWelcome();
  loadPopularQueries();

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

  async function loadPopularQueries() {
    try {
      const res  = await fetch('/api/popular');
      const data = await res.json();
      if (!data.length) return;

      const container = document.getElementById('popular-queries');
      const label     = document.getElementById('popular-label');
      label.style.display = '';

      data.forEach(({ user_message }) => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.dataset.query = user_message;
        btn.textContent = '🔍 ' + (user_message.length > 35
          ? user_message.slice(0, 35) + '…'
          : user_message);
        btn.addEventListener('click', () => {
          sidebar.classList.remove('open');
          inputEl.value = user_message;
          sendMessage();
        });
        container.appendChild(btn);
      });
    } catch {
      // tichá chyba – sekce se prostě nezobrazí
    }
  }

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

  function appendQuickReplies(options) {
    const wrap = document.createElement('div');
    wrap.className = 'quick-replies';
    wrap.id = 'quick-replies';
    options.forEach(text => {
      const btn = document.createElement('button');
      btn.className = 'quick-reply-btn';
      btn.textContent = text;
      btn.addEventListener('click', () => {
        document.getElementById('quick-replies')?.remove();
        inputEl.value = text;
        sendMessage();
      });
      wrap.appendChild(btn);
    });
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
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
