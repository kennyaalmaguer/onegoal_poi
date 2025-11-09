let currentChatId = null;
let currentUserId = null;
let lastMessageCheck = 0;

window.addEventListener('DOMContentLoaded', () => {
    const emptyChat = document.getElementById('emptyChat');
    const messagesContainer = document.getElementById('messagesContainer');
    const inputContainer = document.querySelector('.input-container');
    const chatPanel = document.getElementById('chatPanel');
    const chatsPanel = document.getElementById('chatsPanel');

    // Estado inicial
    if (emptyChat) emptyChat.style.display = 'flex';
    if (messagesContainer) messagesContainer.style.display = 'none';
    if (inputContainer) inputContainer.style.display = 'none';

    // Detectar clics en chats
    document.addEventListener('click', async (e) => {
        const item = e.target.closest('.chat-item');
        if (!item) return;

        const tipo = item.dataset.tipo; // puede ser "privado" o "grupo"
        const userId = item.dataset.chat; // id del usuario o grupo

        const chatPanel = document.getElementById('chatPanel');
        const messagesContainer = chatPanel.querySelector('.messages');
        messagesContainer.innerHTML = "";

        if (tipo === "grupo") {
            console.log("Abrir chat grupal:", userId);

            // Mostrar chat
            if (emptyChat) emptyChat.style.display = 'none';
            if (messagesContainer) messagesContainer.style.display = 'block';
            if (inputContainer) inputContainer.style.display = 'flex';

            // Actualizar encabezado
            const chatAvatar = document.getElementById('userAvatar');
            const chatName = document.getElementById('userName');
            const userStatus = document.getElementById('userStatus');

            const nombre = item.querySelector('.chat-name')?.textContent || 'Grupo';
            const estado = item.dataset.estado || 'Activo';

            chatName.textContent = nombre;
            chatAvatar.innerHTML = '<i class="fas fa-users"></i>';

            if (userStatus) {
                if (estado === 'Activo') {
                    userStatus.textContent = ' Activo';
                    userStatus.style.color = '#28a745';
                } else {
                    userStatus.textContent = 'Inactivo';
                    userStatus.style.color = '#dc3545';
                }
            }

            // Guardar ID actual del chat
            currentChatId = userId;

            await loadMessages(userId, messagesContainer);
            return;
        }

        // Obtener o crear el chat entre ambos usuarios
        const response = await fetch('php/create_chat.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario1: currentUserId, id_usuario2: userId })
        });

        const data = await response.json();
        if (!data.success) {
            console.error("Error al crear/obtener chat:", data.error);
            return;
        }
        
        // Mostrar los elementos del chat
        if (emptyChat) emptyChat.style.display = 'none';
        if (messagesContainer) messagesContainer.style.display = 'block';
        if (inputContainer) inputContainer.style.display = 'flex';

        const chatAvatar = document.getElementById('userAvatar');
        const chatName = document.getElementById('userName');
        const userStatus = document.getElementById('userStatus');
        const nombre = item.querySelector('.chat-name')?.textContent || 'Chat';
        const estado = item.dataset.estado || item.dataset.estado_conexion; // Actualizar encabezado 
        chatName.textContent = nombre;
        chatAvatar.innerHTML = item.querySelector('.chat-avatar')?.innerHTML || nombre[0].toUpperCase();
        
        // Estado visual 
        if (userStatus) {
            if (tipo === 'usuario') {
                if (estado === 'online' || estado === 'Conectado') { 
                    userStatus.textContent = 'En línea'; 
                    userStatus.style.color = '#28a745'; 
                } else { 
                    userStatus.textContent = 'Desconectado'; 
                    userStatus.style.color = '#dc3545'; 
                }
            } else if (tipo === 'grupo') {
                if (estado === 'Activo') { 
                    userStatus.textContent = 'Activo'; 
                    userStatus.style.color = '#28a745'; 
                } else { 
                    userStatus.textContent = 'Inactivo'; 
                    userStatus.style.color = '#dc3545'; 
                }
            } else { 
                userStatus.textContent = ''; 
            }
        }

        // Guardamos el id_chat globalmente
        currentChatId = data.id_chat;
        lastMessageCheck = Date.now(); // Resetear el check de mensajes

        await loadMessages(currentChatId, messagesContainer);
    });

    // Botón atrás (modo móvil)
    const backButton = document.getElementById('backButton');
    backButton?.addEventListener('click', function () {
        if (window.innerWidth <= 768) {
            chatsPanel.style.display = 'flex';
            chatPanel.classList.remove('active');
        }
    });

    // Inicializar usuarios y grupos
    loadUsers();
    cargarGruposUsuario();

    // Iniciar la verificación periódica de mensajes
    startMessagePolling();
});

async function loadMessages(chatId, container) {
    try {
        const resp = await fetch(`php/get_message.php?id_chat=${chatId}&t=${Date.now()}`, {
            cache: "no-store",
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!resp.ok) {
            throw new Error(`HTTP error! status: ${resp.status}`);
        }
        
        const mensajes = await resp.json();

        // Verificar que sea un array
        if (!Array.isArray(mensajes)) {
            console.error("La respuesta no es un array:", mensajes);
            return;
        }

        container.innerHTML = "";

        mensajes.forEach(msg => {
            const div = document.createElement("div");
            div.classList.add("message", msg.id_usuario === currentUserId ? "sent" : "received");

            // ✅ Construir URL absoluta si no la trae completa
            let content = msg.contenido;
            if (msg.tipo !== "texto" && content && !content.startsWith("http")) {
                content = `${window.location.origin}/onegoal_poi/${content}`;
            }

            // 🕒 Formatear hora
            const hora = new Date(msg.fecha_envio).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });

            // ✅ Renderizar según tipo de mensaje
            let messageContent = "";

            switch (msg.tipo) {
                case "texto":
                    messageContent = `<div class="message-text">${sanitizeHTML(content)}</div>`;
                    break;

                case "imagen":
                    messageContent = `
                        <div class="message-image">
                            <img src="${content}" alt="imagen"
                                 onclick="window.open('${content}', '_blank')" />
                        </div>`;
                    break;

                case "video":
                    messageContent = `
                        <div class="message-video">
                            <video controls>
                                <source src="${content}" type="video/mp4">
                                Tu navegador no soporta video.
                            </video>
                        </div>`;
                    break;

                case "archivo":
                    const fileName = decodeURIComponent(content.split('/').pop());
                    messageContent = `
                        <div class="message-file">
                            <a href="${content}" target="_blank" download>
                                📎 ${fileName}
                            </a>
                        </div>`;
                    break;

                default:
                    messageContent = `<div class="message-text">[Tipo desconocido]</div>`;
                    break;
            }

            // 🧩 Ensamblar mensaje
            div.innerHTML = `
                ${messageContent}
                <div class="message-time">${hora}</div>
            `;

            container.appendChild(div);
        });

        // 📜 Mantener scroll abajo
        container.scrollTop = container.scrollHeight;
        
        // Actualizar último check
        lastMessageCheck = Date.now();
        
        console.log(`✅ ${mensajes.length} mensajes cargados para chat ${chatId}`);

    } catch (error) {
        console.error("Error al cargar mensajes:", error);
    }
}

// 🔁 Actualizar mensajes automáticamente cada 2 segundos
function startMessagePolling() {
    setInterval(() => {
        if (currentChatId) {
            const container = document.getElementById("messagesContainer");
            if (container) {
                loadMessages(currentChatId, container);
            }
        }
    }, 2000);
}

// Función para verificar mensajes nuevos (más eficiente)
async function checkForNewMessages() {
    if (!currentChatId) return;
    
    try {
        const resp = await fetch(`php/check_new_messages.php?chat_id=${currentChatId}&last_check=${lastMessageCheck}`, {
            cache: "no-store"
        });
        const data = await resp.json();
        
        if (data.has_new) {
            const container = document.getElementById("messagesContainer");
            await loadMessages(currentChatId, container);
        }
    } catch (error) {
        console.error("Error verificando nuevos mensajes:", error);
    }
}

// Reutilizamos el sanitizador de texto
function sanitizeHTML(str) {
    const temp = document.createElement("div");
    temp.textContent = str;
    return temp.innerHTML;
}

// Funcionalidad para los botones de filtro
document.querySelectorAll('.round-button').forEach(button => {
    button.addEventListener('click', function () {
        document.querySelectorAll('.round-button').forEach(btn => {
            btn.classList.remove('active');
        });
        this.classList.add('active');
    });
});

// Función para actualizar la conversación según el chat seleccionado
async function updateChatConversation(chatId) {
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.innerHTML = "<p>Cargando mensajes...</p>";

    try {
        const response = await fetch(`php/get_message.php?id_chat=${chatId}&t=${Date.now()}`);
        const messages = await response.json();

        messagesContainer.innerHTML = '';

        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', msg.id_usuario == currentUserId ? 'sent' : 'received');

            messageDiv.innerHTML = `
                <div class="message-text">${msg.contenido}</div>
                <div class="message-time">${new Date(msg.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            `;

            messagesContainer.appendChild(messageDiv);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error("Error al cargar mensajes:", error);
    }
}

const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');

// --- Envío de mensajes ---
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

//-------MANDAR MENSAJES---------//
async function sendMessage() {
    const input = document.getElementById("messageInput");
    const contenido = input.value.trim();
    
    if (!contenido || !currentChatId) {
        console.log("No hay contenido o chatId");
        return;
    }

    console.log("Enviando mensaje - currentChatId:", currentChatId, "currentUserId:", currentUserId);
    console.log("contenido:", contenido);

    try {
        const resp = await fetch("php/send_message.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id_chat: currentChatId,
                id_usuario: currentUserId,
                contenido,
                tipo: "texto"
            })
        });
        
        const data = await resp.json();
        if (data?.success) {
            input.value = "";
            
            // Recargar mensajes inmediatamente después de enviar
            const messagesContainer = document.getElementById("messagesContainer");
            await loadMessages(currentChatId, messagesContainer);
            
            console.log("✅ Mensaje enviado y recargado");
        } else {
            console.error("Error al enviar mensaje:", data?.error);
        }
    } catch (err) {
        console.error("Error en envío:", err);
    }
}

async function sendFileMessage(id_chat, id_usuario, file, tipo) {
    const formData = new FormData();
    formData.append("id_chat", id_chat);
    formData.append("id_usuario", id_usuario);
    formData.append("tipo", tipo);
    formData.append("archivo", file);

    try {
        const resp = await fetch("php/send_message.php", {
            method: "POST",
            body: formData
        });

        const result = await resp.json();
        console.log("📦 Respuesta servidor:", result);

        if (result.success) {
            renderMessage(result.url || result.contenido, result.tipo);
            
            // Recargar mensajes después de enviar archivo
            const messagesContainer = document.getElementById("messagesContainer");
            await loadMessages(currentChatId, messagesContainer);
        } else {
            alert("❌ Error al enviar archivo: " + (result.error || "Desconocido"));
        }
    } catch (error) {
        console.error("Error al enviar archivo:", error);
    }
}

attachBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    // Detectar tipo
    let tipo = "archivo";
    const mime = file.type;
    if (mime.startsWith("image/")) tipo = "imagen";
    else if (mime.startsWith("video/")) tipo = "video";
    else if (mime.startsWith("audio/")) tipo = "audio";
    else tipo = "archivo";

    console.log("📎 Tipo detectado:", tipo);

    await sendFileMessage(currentChatId, currentUserId, file, tipo);
});

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Elementos para las listas
const conversationsList = document.getElementById('conversationsList');
const groupsList = document.getElementById('groupsList');
const callsList = document.getElementById('callsList');

// Funcionalidad para los botones de filtro
document.querySelectorAll('.round-button').forEach(button => {
    button.addEventListener('click', function () {
        document.querySelectorAll('.round-button').forEach(btn => {
            btn.classList.remove('active');
        });
        this.classList.add('active');

        // Ocultar todas las listas
        conversationsList.style.display = 'none';
        groupsList.style.display = 'none';
        callsList.style.display = 'none';

        // Mostrar la lista correspondiente
        if (this.textContent === 'Conversaciones') {
            conversationsList.style.display = 'block';
        } else if (this.textContent === 'Grupos') {
            groupsList.style.display = 'block';
        } else if (this.textContent === 'Llamadas') {
            callsList.style.display = 'block';
        }
    });
});

// Añadir event listeners para los grupos
document.querySelectorAll('#groupsList .chat-item').forEach(item => {
    item.addEventListener('click', function () {
        // Ocultar panel izquierdo en móvil
        if (window.innerWidth <= 768) {
            document.getElementById('chatsPanel').style.display = 'none';
            document.getElementById('chatPanel').classList.add('active');
        }

        // Resaltar grupo activo
        document.querySelectorAll('.chat-item').forEach(c => c.classList.remove('active'));
        this.classList.add('active');

        // Mostrar secciones del chat
        const emptyChat = document.getElementById('emptyChat');
        const messagesContainer = document.getElementById('messagesContainer');
        const inputContainer = document.querySelector('.input-container');
        if (emptyChat) emptyChat.style.display = 'none';
        if (messagesContainer) messagesContainer.style.display = 'flex';
        if (inputContainer) inputContainer.style.display = 'flex';

        // Actualizar encabezado
        const groupName = this.querySelector('.chat-name').childNodes[0].textContent.trim();
        const groupEstado = this.getAttribute('data-estado');

        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        const userStatus = document.getElementById('userStatus');

        userName.textContent = groupName;
        userAvatar.innerHTML = '<i class="fas fa-users"></i>';

        if (groupEstado === 'Activo') {
            userStatus.textContent = 'Activo';
            userStatus.style.color = '#28a745';
        } else {
            userStatus.textContent = 'Inactivo';
            userStatus.style.color = '#dc3545';
        }

        updateGroupConversation(this.dataset.chat);
    });
});

// Función para actualizar conversación de grupo
function updateGroupConversation(groupId) {
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.innerHTML = '';

    const conversaciones = {
        grupo1: [
            { type: 'received', text: '¡Hola a todos! ¿Listos para el Mundial?', time: '10:30' },
            { type: 'sent', text: '¡Claro! Ya tengo mis boletos!', time: '10:31' }
        ],
        grupo2: [
            { type: 'received', text: '¿Qué opinan del nuevo formato?', time: '09:15' },
            { type: 'sent', text: 'Me gusta, más equipos participan', time: '09:16' }
        ],
        default: [
            { type: 'received', text: 'Bienvenidos al grupo', time: '12:00' },
            { type: 'sent', text: '¡Gracias por la invitación!', time: '12:01' }
        ]
    };

    const mensajes = conversaciones[groupId] || conversaciones.default;

    mensajes.forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', msg.type);
        msgDiv.innerHTML = `
            <div class="message-text">${msg.text}</div>
            <div class="message-time">${msg.time}</div>
        `;
        messagesContainer.appendChild(msgDiv);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function renderMessage(content, type, sent = true) {
    const messagesContainer = document.querySelector('#messagesContainer');
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageDiv = document.createElement('div');

    // 📌 Asignar clases base
    messageDiv.classList.add(sent ? 'sent' : 'received');

    if (type !== "texto" && content && !content.startsWith('http') && !content.startsWith('blob:')) {
        content = `uploads/${content}`;
    }

    let messageContent = "";

    switch (type) {
        case "texto":
            messageContent = `
                <div class="message-text">${sanitizeHTML(content)}</div>
            `;
            break;

        case "imagen":
            messageContent = `
                <div class="message-image">
                    <img src="${content}" alt="imagen" 
                         onclick="window.open('${content}', '_blank')" />
                </div>
            `;
            break;

        case "video":
            messageContent = `
                <div class="message-video">
                    <video controls>
                        <source src="${content}" type="video/mp4">
                        Tu navegador no soporta la reproducción de video.
                    </video>
                </div>
            `;
            break;

        case "archivo":
            const fileName = decodeURIComponent(content.split('/').pop());
            messageContent = `
                <div class="message-file">
                    <a href="${content}" target="_blank" download>
                         ${fileName}
                    </a>
                </div>
            `;
            break;

        default:
            messageContent = `
                <div class="message-text">[Tipo de mensaje desconocido]</div>
            `;
            break;
    }

    // 📦 Estructura final del mensaje
    messageDiv.innerHTML = `
        ${messageContent}
        <div class="message-time">${currentTime}</div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

const searchBox = document.querySelector('.search-box');
let usuarios = [];
let userAvatarMap = {};

async function loadUsers() {
    try {
        const resp = await fetch('php/get_users.php');
        const data = await resp.json();

        if (!data.success) {
            console.error("Error al cargar usuarios:", data.message);
            return;
        }

        const user = data.current_user;
        currentUserId = user.id_usuario;

        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userStatus = document.getElementById('userStatus');

        userAvatar.innerHTML = user.foto_perfil
            ? `<img src="${user.foto_perfil}" alt="Perfil" class="avatar-img">`
            : user.nombre.charAt(0).toUpperCase();

        userName.textContent = user.nombre;
        userStatus.textContent = user.estado_conexion === 'online' ? ' En línea' : ' Desconectado';

        usuarios = data.usuarios;
        userAvatarMap = {};

        usuarios.forEach(u => {
            userAvatarMap[u.id_usuario] = u.foto_perfil
                ? `<img src="${u.foto_perfil}" alt="${u.nombre}" class="avatar-img">`
                : u.nombre[0];
        });

        currentUserId = data.current_user.id_usuario;

    } catch (error) {
        console.error("Error al cargar usuarios:", error);
    }
}

// Filtrar usuarios al escribir
searchBox.addEventListener('input', function () {
    const query = this.value.toLowerCase();
    const filtered = usuarios.filter(u => u.nombre.toLowerCase().includes(query));

    conversationsList.innerHTML = '';
    filtered.forEach(user => {
        const div = document.createElement('div');
        div.classList.add('chat-item');
        div.dataset.chat = user.id_usuario;
        div.dataset.tipo = 'usuario';
        div.dataset.estado_conexion = user.estado_conexion;

        div.innerHTML = `
            <div class="chat-avatar">
                ${user.foto_perfil
                ? `<img src="${user.foto_perfil}" alt="${user.nombre}" class="avatar-img">`
                : user.nombre[0]}
            </div>
            <div class="chat-info">
                <div class="chat-name">${user.nombre}</div>
                <div class="chat-preview">Iniciar chat</div>
            </div>
            <div class="chat-time">Ahora</div>
        `;

        conversationsList.appendChild(div);
    });
});

function startChatWith(userId, userName) {
    if (userId == currentUserId) {
        console.warn("No puedes iniciar un chat contigo mismo");
        return;
    }

    const messagesContainer = document.querySelector('messagesContainer');
    document.querySelector('.chat-header .chat-name').textContent = userName;
    document.querySelector('.chat-header .user-avatar').innerHTML = userAvatarMap[userId] || userName[0];
    messagesContainer.innerHTML = '<p>Comienza la conversación...</p>';
}

//-----------ESTO ES PARA LO DE LOS GRUPOOS--------------//
document.addEventListener('DOMContentLoaded', loadUsers);

function startChatWith(userId, userName) {
    // Evitar chatear contigo mismo
    if (userId == currentUserId) {
        console.warn("No puedes iniciar un chat contigo mismo");
        return;
    }

    currentChatId = null;
    document.querySelector('.chat-header .chat-name').textContent = userName;

    const avatarEl = document.querySelector('.chat-header .user-avatar');
    avatarEl.innerHTML = userAvatarMap[userId] || userName[0]; // ver solución 2

    messagesContainer.innerHTML = '<p>Comienza la conversación...</p>';
}

document.addEventListener('DOMContentLoaded', () => {
    cargarGruposUsuario();
});

function cargarGruposUsuario() {
    fetch('php/grupo_chat.php')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const groupsList = document.getElementById('groupsList');
                groupsList.innerHTML = '';

                data.grupos.forEach(g => {
                    const div = document.createElement('div');
                    div.classList.add('chat-item');
                    div.dataset.chat = g.id_chat; // ahora sí es real
                    div.dataset.tipo = 'grupo';
                    div.dataset.estado = g.estado;

                    div.innerHTML = `
        <div class="chat-avatar"><i class="fas fa-users"></i></div>
        <div class="chat-info">
            <div class="chat-name">${g.nombre}</div>
            <div class="chat-last">${g.estado === 'Activo' ? ' Activo' : ' Inactivo'} — Creador: ${g.nombre_creador}</div>
        </div>
    `;

                    groupsList.appendChild(div);
                });

                attachGroupListeners(); // agregar event listeners dinámicamente
            }
        })
        .catch(err => console.error('Error cargando grupos:', err));
}

function attachGroupListeners() {
    document.querySelectorAll('#groupsList .chat-item').forEach(item => {
        item.addEventListener('click', function () {
            if (window.innerWidth <= 768) {
                chatsPanel.style.display = 'none';
                chatPanel.classList.add('active');
            }
            document.querySelectorAll('.chat-item').forEach(chat => chat.classList.remove('active'));
            this.classList.add('active');

            const groupName = this.querySelector('.chat-name').textContent;
            currentChatId = parseInt(this.dataset.chat); // ✅ número real
            document.querySelector('.chat-header .chat-name').textContent = this.querySelector('.chat-name').textContent;
            document.querySelector('.chat-header .user-avatar').innerHTML = '<i class="fas fa-users"></i>';

            updateChatConversation(currentChatId); // carga mensajes reales
        });
    });
}

function activarListenersGrupos() {
    document.querySelectorAll('#groupsList .chat-item').forEach(item => {
        item.addEventListener('click', function () {
            // Ocultar lista en móviles
            if (window.innerWidth <= 768) {
                document.getElementById('chatsPanel').style.display = 'none';
                document.getElementById('chatPanel').classList.add('active');
            }

            // Quitar "active" de todos y agregarlo al actual
            document.querySelectorAll('.chat-item').forEach(chat => chat.classList.remove('active'));
            this.classList.add('active');

            // Obtener datos del grupo
            const groupName = this.querySelector('.chat-name').textContent.trim();
            const estadoGrupo = this.getAttribute('data-estado');

            // Actualizar encabezado del chat
            const userName = document.getElementById('userName');
            const userAvatar = document.getElementById('userAvatar');
            const userStatus = document.getElementById('userStatus');

            userName.textContent = groupName;
            userAvatar.innerHTML = '<i class="fas fa-users"></i>';

            if (estadoGrupo === 'Activo') {
                userStatus.textContent = 'Activo';
                userStatus.style.color = '#28a745';
            } else {
                userStatus.textContent = 'Inactivo';
                userStatus.style.color = '#dc3545';
            }

            // Mostrar conversación del grupo
            updateGroupConversation(this.getAttribute('data-chat'));
        });
    });
}

// Función auxiliar para debug
function debugCurrentState() {
    console.log("=== DEBUG ESTADO ACTUAL ===");
    console.log("currentUserId:", currentUserId);
    console.log("currentChatId:", currentChatId);
    console.log("lastMessageCheck:", lastMessageCheck);
    console.log("========================");
}

// Ejecutar debug cada 5 segundos (opcional)
setInterval(debugCurrentState, 5000);