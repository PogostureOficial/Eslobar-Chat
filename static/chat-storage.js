/* =========================================================
   Eslobar — ChatStore (localStorage)
   Depende de:
   - #chat, #titulo, .chat-container
   - .chat-list, #newChatBtn
   - .chat-item/.chat-title/.chat-actions/.chat-menu-btn
   - .chat-dropdown .rename-btn / .delete-btn
   - funciones globales: parseBold(text), typeWriterEffect(...)
========================================================= */

(function () {
  const LS_CHATS_KEY = 'eslobar.chats';
  const LS_CURRENT_ID = 'eslobar.currentChatId';

  const chatEl = document.getElementById('chat');
  const titleEl = document.getElementById('titulo');
  const chatListEl = document.querySelector('.chat-list');
  const chatContainer = document.querySelector('.chat-container');
  const newChatBtn = document.getElementById('newChatBtn');

  // Util
  const uid = () => 'c_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  const now = () => new Date().toISOString();

  // Estado en memoria
  let chats = [];
  let currentId = null;

  // === Storage ===
  function load() {
    try { chats = JSON.parse(localStorage.getItem(LS_CHATS_KEY)) || []; } catch { chats = []; }
    currentId = localStorage.getItem(LS_CURRENT_ID) || null;
  }
  function save() {
    localStorage.setItem(LS_CHATS_KEY, JSON.stringify(chats));
    if (currentId) localStorage.setItem(LS_CURRENT_ID, currentId);
  }

  // === CRUD Chats ===
  function createChat(title = 'Nuevo chat') {
    const id = uid();
    const chat = {
      id,
      title,
      messages: [],
      createdAt: now(),
      updatedAt: now()
    };
    chats.unshift(chat); // arriba de todo
    currentId = id;
    save();
    return chat;
  }

  function findChat(id) {
    return chats.find(c => c.id === id);
  }

  function renameChat(id, newTitle) {
    const c = findChat(id);
    if (!c) return;
    c.title = newTitle || c.title;
    c.updatedAt = now();
    save();
    renderChatList();
  }

  function deleteChat(id) {
    const idx = chats.findIndex(c => c.id === id);
    if (idx === -1) return;
    chats.splice(idx, 1);
    if (currentId === id) currentId = chats[0]?.id || null;
    save();
    renderChatList();
    if (currentId) {
      openChat(currentId);
    } else {
      clearChatUI();
    }
  }

  // === Mensajes ===
  function addMessage(role, content, { chatId = currentId } = {}) {
    let c = findChat(chatId);
    if (!c) c = createChat(); // safety
    c.messages.push({ role, content, ts: now() });
    c.updatedAt = now();
    // Setear título a partir del primer mensaje del user si aplica
    if (c.title === 'Nuevo chat') {
      const firstUser = c.messages.find(m => m.role === 'user');
      if (firstUser) {
        const t = firstUser.content.trim().replace(/\s+/g, ' ').slice(0, 30);
        if (t) c.title = t + (firstUser.content.length > 30 ? '…' : '');
      }
    }
    save();
    renderChatList();
  }

  // === Render ===
  function clearChatUI() {
    if (!chatEl || !titleEl || !chatContainer) return;
    chatEl.innerHTML = '';
    chatContainer.classList.remove('active');
    titleEl.style.opacity = '1';
  }

  function renderMessages(chat) {
    if (!chatEl) return;
    chatEl.innerHTML = '';
    chat.messages.forEach(msg => {
      const div = document.createElement('div');
      div.className = `message ${msg.role === 'user' ? 'user' : 'bot'}`;
      // mantener parse de negritas para user, y HTML simple para bot ya guardado
      div.innerHTML = msg.role === 'user' ? (window.parseBold ? window.parseBold(msg.content) : msg.content) : msg.content;
      chatEl.appendChild(div);
    });
    chatEl.scrollTop = chatEl.scrollHeight;
    // estado visual
    if (chat.messages.length) {
      chatContainer.classList.add('active');
      if (titleEl) titleEl.style.opacity = '0';
    } else {
      chatContainer.classList.remove('active');
      if (titleEl) titleEl.style.opacity = '1';
    }
  }

  function renderChatList() {
    if (!chatListEl) return;
    chatListEl.innerHTML = '';
    chats.forEach(c => {
      // estructura exacta a tu HTML
      const item = document.createElement('div');
      item.className = 'chat-item';
      item.dataset.id = c.id;

      item.innerHTML = `
        <span class="chat-title">${escapeHtml(c.title)}</span>
        <div class="chat-actions">
          <button class="chat-menu-btn">⋯</button>
          <div class="chat-dropdown">
            <button class="rename-btn">Cambiar nombre</button>
            <button class="delete-btn">Eliminar</button>
          </div>
        </div>
      `;
      chatListEl.appendChild(item);
    });
    // marcar activo
    Array.from(chatListEl.querySelectorAll('.chat-item')).forEach(el => {
      el.classList.toggle('active', el.dataset.id === currentId);
    });
  }

  // Pequeño escape para títulos
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));
  }

  // === Abrir chat ===
  function openChat(id) {
    const c = findChat(id);
    if (!c) return;
    currentId = id;
    save();
    renderChatList();
    renderMessages(c);
  }

  // === Nuevo chat (UI) ===
  function createAndOpenChat() {
    const c = createChat('Nuevo chat');
    clearChatUI();
    renderChatList();
    openChat(c.id);
    // En nuevo chat queremos estado vacío visible
    chatEl.innerHTML = '';
    chatContainer.classList.remove('active');
    if (titleEl) titleEl.style.opacity = '1';
  }

  // === Delegación de eventos en lista ===
  function setupListEvents() {
    if (!chatListEl) return;

    // Abrir menú “⋯”
    chatListEl.addEventListener('click', (e) => {
      const btnMenu = e.target.closest('.chat-menu-btn');
      const item = e.target.closest('.chat-item');
      if (btnMenu && item) {
        e.stopPropagation();
        // cerrar otros
        chatListEl.querySelectorAll('.chat-dropdown').forEach(d => d.style.display = 'none');
        btnMenu.nextElementSibling.style.display = 'flex';
        return;
      }

      // Renombrar
      const btnRename = e.target.closest('.rename-btn');
      if (btnRename && item) {
        const id = item.dataset.id;
        const chat = findChat(id);
        const nuevo = prompt('Nuevo nombre del chat:', chat?.title || '');
        if (nuevo && nuevo.trim()) renameChat(id, nuevo.trim());
        // cerrar el menú
        btnRename.parentElement.style.display = 'none';
        return;
      }

      // Eliminar
      const btnDelete = e.target.closest('.delete-btn');
      if (btnDelete && item) {
        const id = item.dataset.id;
        // Si querés confirmación nativa:
        // if (!confirm('¿Eliminar este chat?')) return;
        deleteChat(id);
        return;
      }

      // Abrir chat al hacer click en el item (que no sea sobre el menú)
      const itemClick = e.target.closest('.chat-item');
      if (itemClick && !e.target.closest('.chat-actions')) {
        openChat(itemClick.dataset.id);
      }
    });

    // Cerrar dropdowns al click afuera
    document.addEventListener('click', () => {
      chatListEl.querySelectorAll('.chat-dropdown').forEach(d => d.style.display = 'none');
    });
  }

  // === Hook “Nuevo chat” ===
  function setupNewChatBtn() {
    if (!newChatBtn) return;
    newChatBtn.addEventListener('click', () => {
      createAndOpenChat();
    });
  }

  // === API pública para integración con enviarMensaje ===
  window.ChatStore = {
    init() {
      load();
      renderChatList();
      setupListEvents();
      setupNewChatBtn();
      // abrir último seleccionado si hay, sinó dejar vacío
      if (currentId && findChat(currentId)) openChat(currentId);
      else clearChatUI();
    },
    addUserMessage(text) {
      if (!currentId || !findChat(currentId)) createAndOpenChat();
      addMessage('user', text);
    },
    addBotMessage(htmlOrText) {
      if (!currentId || !findChat(currentId)) createAndOpenChat();
      addMessage('bot', htmlOrText);
    },
    openChat,
    createAndOpenChat,
    renameChat,
    deleteChat
  };
})();
