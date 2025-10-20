/* ===========================
   /static/chat-storage.js
   Lógica de persistencia local
   =========================== */
function waitForEnviarMensaje(callback) {
  if (typeof window.enviarMensaje === "function") {
    callback();
  } else {
    setTimeout(() => waitForEnviarMensaje(callback), 50);
  }
}

waitForEnviarMensaje(() => {
  console.log("✅ enviarMensaje disponible, chat-storage listo");
  // aquí el resto de tu código de chat-storage.js


   (function() {
     // --- Config ---
     const STORAGE_KEY = 'eslobar_chats_v1';
     const CURRENT_KEY = 'eslobar_current_chat_id';
     const chatListEl = document.getElementById('chatList');
     const newChatBtn = document.getElementById('newChatBtn');
     const chatContainer = document.getElementById('chat');
     const tituloEl = document.getElementById('titulo');
     const inputEl = document.getElementById('mensaje');

     if (!chatListEl || !chatContainer || !inputEl) {
       console.warn('chat-storage: elementos DOM no encontrados — asegúrate de incluir el script al final del body.');
       return;
     }

     // --- Estado en memoria ---
     let chats = loadChats(); // array de chats persistidos
     let currentChatId = null; // null => chat vacío temporal (no guardado)
     let tempMessages = []; // mensajes del chat vacio no guardado
     let observer = null;
     let originalEnviar = window.enviarMensaje; // referencia a la función original

     // --- Utilidades ---
     function saveChats() {
       localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
     }
     function loadChats() {
       try {
         return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
       } catch (e) {
         console.warn('No se pudo parsear chats', e);
         return [];
       }
     }
     function generateId() {
       return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
     }
     function formatTitleFromText(text) {
       if (!text) return 'Nuevo chat';
       // quitar saltos y símbolos y tomar primeras 6 palabras
       const cleaned = text.replace(/\s+/g, ' ').trim();
       const words = cleaned.split(' ').slice(0,6);
       let title = words.join(' ');
       if (cleaned.length > title.length) title = title + '…';
       // capitalizar primera letra
       return title.charAt(0).toUpperCase() + title.slice(1);
     }
     function escapeHtml(s) {
       return s.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
     }
     function formatUserContentToHTML(text) {
       // soporte simple de *negrita* → <b>
       const escaped = escapeHtml(text);
       return escaped.replace(/\*(.*?)\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
     }

     // --- UI: render sidebar list ---
     function renderSidebar() {
       chatListEl.innerHTML = '';
       // order: últimos actualizados arriba
       const sorted = chats.slice().sort((a,b)=> b.updatedAt - a.updatedAt);
       sorted.forEach(chat => {
         const item = document.createElement('div');
         item.className = 'chat-item';
         if (chat.id === currentChatId) item.classList.add('active');

         const title = document.createElement('div');
         title.className = 'title';
         title.textContent = chat.title || 'Sin título';

         const meta = document.createElement('div');
         meta.className = 'meta';
         const d = new Date(chat.updatedAt || chat.createdAt || Date.now());
         meta.textContent = d.toLocaleDateString();

         const right = document.createElement('div');
         right.style.display = 'flex';
         right.style.gap = '6px';
         right.style.alignItems = 'center';

         const openBtn = document.createElement('button');
         openBtn.textContent = 'Abrir';
         openBtn.style.background = 'transparent';
         openBtn.style.border = 'none';
         openBtn.style.color = '#aeb2c0';
         openBtn.style.cursor = 'pointer';
         openBtn.addEventListener('click', (e) => {
           e.stopPropagation();
           loadChat(chat.id);
           // en mobile cerrar sidebar si querés: window.closeMobileSidebar && window.closeMobileSidebar();
         });

         const trash = document.createElement('button');
         trash.className = 'trash-btn';
         trash.innerHTML = '🗑';
         trash.title = 'Borrar chat';
         trash.addEventListener('click', (e) => {
           e.stopPropagation();
           if (!confirm('¿Borrar este chat?')) return;
           deleteChat(chat.id);
         });

         right.appendChild(openBtn);
         right.appendChild(trash);

         item.appendChild(title);
         item.appendChild(right);

         item.addEventListener('click', () => loadChat(chat.id));
   
         chatListEl.appendChild(item);
       });
     }

     function deleteChat(id) {
       chats = chats.filter(c => c.id !== id);
       saveChats();
       // si el chat borrado era el actual, abrir chat vacío
       if (currentChatId === id) {
         currentChatId = null;
         tempMessages = [];
         renderChatMessagesFromArray([]);
         localStorage.removeItem(CURRENT_KEY);
       }
       renderSidebar();
     }

     // --- Renderizar mensajes en DOM (limpia y pone mensajes) ---
     function renderChatMessagesFromArray(messages) {
        disconnectObserver();

        chatContainer.innerHTML = '';
        messages.forEach(msg => {
          const div = document.createElement('div');
          div.className = msg.role === 'user' ? 'message user' : 'message bot';
          div.innerHTML = msg.html || escapeHtml(msg.content || '');
          chatContainer.appendChild(div);
        });

  // Forzar redimensionar chat-container si hay mensajes
        if (messages.length > 0) {
          chatContainer.style.justifyContent = 'flex-start'; // mensajes arriba
          chatContainer.style.alignItems = 'stretch';       // ocupan ancho completo
        } else {
          chatContainer.style.justifyContent = 'center';    // comportamiento por defecto
          chatContainer.style.alignItems = 'center';
        }

  // Scroll al final
        setTimeout(() => {
          chatContainer.scrollTop = chatContainer.scrollHeight;
          if (tituloEl) tituloEl.style.opacity = messages.length ? '0' : '1';
        }, 0);

        connectObserver();
      }




     // --- Load chat (cuando clickeás en sidebar) ---
     function loadChat(id) {
       const c = chats.find(x => x.id === id);
       if (!c) return;
       currentChatId = c.id;
       localStorage.setItem(CURRENT_KEY, currentChatId);
       renderChatMessagesFromArray(c.messages || []);
       renderSidebar(); // para actualizar active
     }

     // --- Crear nuevo chat persistido (al enviar primer mensaje) ---
     function createNewChatFromFirstMessage(firstUserText, firstUserHtml) {
       const id = generateId();
       const title = formatTitleFromText(firstUserText);
       const now = Date.now();
       const chat = {
         id,
         title,
         createdAt: now,
         updatedAt: now,
         messages: [
           { role: 'user', content: firstUserText, html: firstUserHtml, ts: now }
         ]
       };
       chats.push(chat);
       saveChats();
       currentChatId = id;
       localStorage.setItem(CURRENT_KEY, currentChatId);
       renderSidebar();
       return chat;
     }

     // --- Añadir mensaje al chat persistido ---
     function appendMessageToCurrentChat(role, contentHTML, rawContent) {
       if (!currentChatId) return;
       const c = chats.find(x => x.id === currentChatId);
       if (!c) return;
       const now = Date.now();
       c.messages.push({
         role: role,
         content: rawContent || '',
         html: contentHTML || '',
         ts: now
       });
       c.updatedAt = now;
       saveChats();
       renderSidebar();
     }

     // --- Nuevo chat vacío (temporal) ---
     function openNewEmptyChat() {
       currentChatId = null;
       tempMessages = [];
       localStorage.removeItem(CURRENT_KEY);
       renderChatMessagesFromArray([]);
       // poner título aleatorio o mantener el comportamiento actual
       if (tituloEl) tituloEl.style.opacity = '1';
       renderSidebar();
     }

     // --- MutationObserver para captar respuestas del bot automáticamente ---
     function connectObserver() {
       if (!('MutationObserver' in window)) return;
       if (observer) observer.disconnect();

       observer = new MutationObserver((mutations) => {
         for (const mut of mutations) {
           if (mut.type === 'childList' && mut.addedNodes.length) {
             for (const node of mut.addedNodes) {
               if (!(node instanceof Element)) continue;
               if (node.classList.contains('message') && node.classList.contains('bot')) {
                 // ignorar loading nodes
                 if (node.classList.contains('loading')) continue;
                 // Esperamos un poco para obtener el contenido final (typewriter)
                 setTimeout(() => {
                   // sólo guardar si hay un chat persistido; si no, lo guardamos temporalmente
                   const html = node.innerHTML || '';
                   const text = node.innerText || '';
                   if (currentChatId) {
                     appendMessageToCurrentChat('assistant', html, text);
                   } else {
                  // si no hay chat persistido, añadir a tempMessages (no persiste hasta primer envio)
                     tempMessages.push({ role: 'assistant', content: text, html, ts: Date.now() });
                   }
                 }, 5000);
               }
             }
           }
         }
       });

       observer.observe(chatContainer, { childList: true, subtree: false });
     }

     function disconnectObserver() {
       if (observer) observer.disconnect();
     }

  // --- Inicializar wrapper sobre enviarMensaje (interceptar primer envío) ---
     function initEnviarWrapper() {
       // si no hay función original, no hacemos nada
       if (typeof originalEnviar !== 'function') {
         console.warn('chat-storage: window.enviarMensaje no está disponible (carga de scripts en orden?). Asegúrate de incluir chat-storage.js **después** del script original.');
         return;
       }

       // Reemplazamos con wrapper
       window.enviarMensaje = async function(...args) {
         // tomar texto del input
         const userText = (inputEl.value || '').trim();
         if (!userText) return; // evitar envio vacío

         // Formateo HTML del usuario (coherente con parseBold)
         const userHtml = formatUserContentToHTML(userText);

         // Si no existe chat persistido (primer envio de este chat), crear nuevo chat y guardar primer mensaje
         if (!currentChatId) {
           createNewChatFromFirstMessage(userText, userHtml);
         } else {
           // si ya existe chat persistido solo anexamos el mensaje (lo almacenamos inmediatamente)
           appendMessageToCurrentChat('user', userHtml, userText);
         }

         // Llamamos a la función original que realiza fetch al backend y actualiza el DOM
         // (la función original seguirá creando los elementos DOM; nuestro observer guardará la respuesta)
         try {
           await originalEnviar.apply(this, args);
         } catch (e) {
           console.error('Error en enviarMensaje original:', e);
         }

         // After sending, ensure scroll and UI
         chatContainer.scrollTop = chatContainer.scrollHeight;
       };
     }

     // --- Inicialización general ---
     function init() {
        renderSidebar();
        // Abrir siempre chat vacío al cargar
        openNewEmptyChat();

        connectObserver();
        initEnviarWrapper();

        newChatBtn.addEventListener('click', openNewEmptyChat);
      }

    // al cargar, si hay mensajes en tempMessages (por ejemplo si el usuario
    // escribió y la IA ya respondió antes de que se persistiera), se mantienen
    // en la vista pero no persisten hasta que se envie el primer mensaje del chat.
     

  // Ejecutar inicialización en el siguiente tick (ya que script se carga al final)
     setTimeout(init, 50);

   })();
}); // <- cierra el callback y la llamada a waitForEnviarMensaje









