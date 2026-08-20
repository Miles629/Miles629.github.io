(() => {
  const chat = document.querySelector('.ama-chat');
  if (!chat) return;
  const endpoint = chat.dataset.chatEndpoint;
  const form = chat.querySelector('form');
  const input = chat.querySelector('input');
  const send = form.querySelector('button[type="submit"]');
  const clear = chat.querySelector('.ama-chat__clear');
  const overlay = chat.querySelector('.ama-chat__overlay');
  const messages = chat.querySelector('.ama-chat__messages');
  const history = [];
  const DAILY_LIMIT_MESSAGE = "You have reached today's chat limit. Please browse the website yourself, or contact me directly.";
  const isDailyLimitError = (response, data, error) => {
    if (response && (response.status === 429 || data?.code === 'daily_limit')) return true;
    const message = `${data?.error || ''} ${error?.message || ''}`;
    return /too many requests|daily (chat )?limit|load failed/i.test(message);
  };
  const addMessage = (text, role, sources = []) => {
    const bubble = document.createElement('div');
    bubble.className = `ama-chat__message ama-chat__message--${role}`;
    bubble.textContent = text;
    if (sources.length) {
      const list = document.createElement('div'); list.className = 'ama-chat__sources';
      sources.forEach(({ title, url }) => {
        if (!title || !url) return;
        const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = `Source: ${title}`;
        list.appendChild(link);
      });
      bubble.appendChild(list);
    }
    messages.appendChild(bubble); overlay.classList.add('is-visible'); clear.hidden = false; overlay.scrollTop = overlay.scrollHeight;
  };
  const ask = async (message) => {
    if (!endpoint || !endpoint.startsWith('https://')) { addMessage('Chat is being configured.', 'assistant'); return; }
    addMessage(message, 'user'); input.value = ''; send.disabled = true;
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, history: history.slice(-8) }) });
      const data = await response.json().catch(() => ({}));
      if (isDailyLimitError(response, data)) { addMessage(DAILY_LIMIT_MESSAGE, 'assistant'); return; }
      if (!response.ok) throw new Error(data.error || 'The assistant is temporarily unavailable.');
      addMessage(data.answer, 'assistant', Array.isArray(data.sources) ? data.sources : []);
      history.push({ role: 'user', content: message }, { role: 'assistant', content: data.answer });
      if (history.length > 16) history.splice(0, history.length - 16);
    } catch (error) { addMessage(isDailyLimitError(null, {}, error) ? DAILY_LIMIT_MESSAGE : (error.message || 'Something went wrong. Please try again later.'), 'assistant'); }
    finally { send.disabled = false; input.focus(); }
  };
  form.addEventListener('submit', event => { event.preventDefault(); const message = input.value.trim(); if (message) ask(message); });
  clear.addEventListener('click', () => { history.splice(0); messages.replaceChildren(); overlay.classList.remove('is-visible'); clear.hidden = true; input.focus(); });
})();
