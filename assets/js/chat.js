(() => {
  const chat = document.querySelector('.ama-chat');
  if (!chat) return;
  const endpoint = chat.dataset.chatEndpoint;
  const form = chat.querySelector('form');
  const input = chat.querySelector('textarea');
  const send = form.querySelector('button[type="submit"]');
  const messages = chat.querySelector('.ama-chat__messages');
  const status = chat.querySelector('.ama-chat__status');
  const history = [];
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
    messages.appendChild(bubble); messages.scrollTop = messages.scrollHeight;
  };
  const ask = async (message) => {
    if (!endpoint || !endpoint.startsWith('https://')) { status.textContent = 'Chat is being configured'; return; }
    addMessage(message, 'user'); input.value = ''; send.disabled = true; status.textContent = 'Thinking…';
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, history: history.slice(-8) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The assistant is temporarily unavailable.');
      addMessage(data.answer, 'assistant', Array.isArray(data.sources) ? data.sources : []);
      history.push({ role: 'user', content: message }, { role: 'assistant', content: data.answer });
      if (history.length > 16) history.splice(0, history.length - 16);
      status.textContent = 'Ready';
    } catch (error) { addMessage(error.message || 'Something went wrong. Please try again later.', 'assistant'); status.textContent = 'Unavailable'; }
    finally { send.disabled = false; input.focus(); }
  };
  form.addEventListener('submit', event => { event.preventDefault(); const message = input.value.trim(); if (message) ask(message); });
  chat.querySelectorAll('.ama-chat__suggestions button').forEach(button => button.addEventListener('click', () => { input.value = button.textContent; form.requestSubmit(); }));
})();
