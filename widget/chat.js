(function () {
  const API_URL = '/api/chat';

  const messagesEl   = document.getElementById('chat-messages');
  const inputEl      = document.getElementById('chat-input');
  const sendBtn      = document.getElementById('chat-send');
  const sidebar      = document.getElementById('sidebar');
  const toggleBtn    = document.getElementById('sidebar-toggle');
  const newChatBtn   = document.getElementById('new-chat-btn');

  let conversationHistory = [];

  function getClientId() {
    const ga = document.cookie.split('; ').find(c => c.startsWith('_ga='));
    if (!ga) return null;
    const parts = ga.split('=')[1].split('.');
    return parts.length >= 4 ? `${parts[2]}.${parts[3]}` : null;
  }

  const CLIENT_ID = getClientId();

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
      { label: 'Dnešní menu v Pardubicích',   query: 'Dnešní menu v Pardubicích' },
      { label: 'Zítřejší menu v Pardubicích', query: 'Zítřejší menu v Pardubicích' },
      { label: 'Tradiční česká jídla',        query: 'Které restaurace mají dnes v Pardubicích tradiční česká jídla jako svíčková, guláš nebo řízek?' },
    ]);
  }

  initWelcome();
  loadPopularQueries();
  loadCitiesToday();

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

  async function loadCitiesToday() {
    try {
      const res  = await fetch('/api/cities-today');
      const data = await res.json();
      if (!data.length) return;

      const container = document.getElementById('cities-today');
      const label     = document.getElementById('cities-label');
      label.style.display = '';

      data.forEach(({ name }) => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.textContent = `🏙️ ${name}`;
        btn.addEventListener('click', () => {
          sidebar.classList.remove('open');
          inputEl.value = `Jaké restaurace dnes nabízí menu v ${name}?`;
          sendMessage();
        });
        container.appendChild(btn);
      });
    } catch {
      // tichá chyba
    }
  }

  async function loadPopularQueries() {
    try {
      const res  = await fetch('/api/popular');
      const data = await res.json();
      if (!data.length) return;

      const container = document.getElementById('popular-queries');
      const label     = document.getElementById('popular-label');
      label.style.display = '';

      data.forEach(({ label, query }) => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.dataset.query = query;
        btn.textContent = '🔍 ' + label;
        btn.addEventListener('click', () => {
          sidebar.classList.remove('open');
          inputEl.value = query;
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

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'prompt_inserted' });

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 120_000);

    try {
      const res  = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, history: conversationHistory, client_id: CLIENT_ID }),
        signal:  controller.signal,
      });
      const data = await res.json();
      if (data.history) conversationHistory = data.history;
      appendMessage('bot', formatReply(data.reply || data.error || 'Něco se pokazilo.'));
      if (data.response_time_ms) appendMeta(`⏱ ${(data.response_time_ms / 1000).toFixed(1)}s`);
      if (data.suggestions?.length) {
        appendQuickReplies(data.suggestions.map(s => ({ label: s, query: s })));
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        appendMessage('bot', 'Dotaz trval příliš dlouho. Zkus to prosím znovu.');
      } else {
        appendMessage('bot', 'Nepodařilo se spojit se serverem.');
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  function appendMeta(text) {
    const el = document.createElement('div');
    el.className = 'message-meta';
    el.textContent = text;
    messagesEl.appendChild(el);
  }

  function appendQuickReplies(options) {
    const wrap = document.createElement('div');
    wrap.className = 'quick-replies';
    options.forEach(item => {
      const label = typeof item === 'string' ? item : item.label;
      const query = typeof item === 'string' ? item : item.query;
      const btn = document.createElement('button');
      btn.className = 'quick-reply-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        wrap.remove();
        inputEl.value = query;
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

    if (role === 'bot') {
      const avatar = document.createElement('img');
      avatar.className = 'bot-avatar';
      avatar.src = '/assets/chef.png';
      avatar.alt = 'Pan Oběd';
      wrap.appendChild(avatar);
    }

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
      el.innerHTML = '<img class="bot-avatar" src="/assets/chef.png" alt="Pan Oběd"><div class="bubble typing-dots"><span></span><span></span><span></span></div>';
      messagesEl.appendChild(el);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } else if (!active && existing) {
      existing.remove();
    }
  }

  // Markdown-lite: **tučné**, [text](url), nové řádky → <br>
  function formatReply(text) {
    // Nejdřív escapujeme HTML, pak aplikujeme markdown
    // Poznámka: URL nechceme escapovat, proto zpracujeme odkazy před escapováním
    const parts = [];
    let last = 0;
    const linkRe = /\[([^\]]+)\]\((\/r\/\d+)\)/g;
    let m;
    while ((m = linkRe.exec(text)) !== null) {
      parts.push(escapeHtml(text.slice(last, m.index)));
      parts.push(`<a href="${m[2]}" target="_blank" class="restaurant-link">${escapeHtml(m[1])}</a>`);
      last = m.index + m[0].length;
    }
    parts.push(escapeHtml(text.slice(last)));
    return parts.join('')
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
