let currentChatId = null;
let currentUserId = null;
let lastMessageCheck = 0;

// Función de debug
function debugLog(message, data = null) {
    console.log(`🔍 ${message}`, data || '');
}

// Inicialización principal
document.addEventListener('DOMContentLoaded', function() {
    debugLog("Iniciando chat.js");
    
    const chatsPanel = document.getElementById('chatsPanel');
    const chatPanel = document.getElementById('chatPanel');
    const backButton = document.getElementById('backButton');
    
    // Verificar elementos críticos
    if (!chatsPanel || !chatPanel) {
        console.error("❌ No se encontraron los paneles principales");
        return;
    }
    
    debugLog("Elementos encontrados:", {
        chatsPanel: !!chatsPanel,
        chatPanel: !!chatPanel,
        backButton: !!backButton
    });

    // Botón de retroceso para móvil
    if (backButton) {
        backButton.addEventListener('click', function() {
            debugLog("Botón retroceso clickeado");
            if (window.innerWidth <= 768) {
                chatsPanel.style.display = 'flex';
                chatPanel.style.display = 'none';
                
                // Limpiar selección
                document.querySelectorAll('.chat-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                debugLog("Volviendo a lista de chats");
            }
        });
    }

    // Cargar datos iniciales
    loadUsers();
    cargarGruposUsuario();
    startMessagePolling();
    
    debugLog("Inicialización completada");
});

// MANEJADOR DE CLICS EN CHATS - VERSIÓN SIMPLIFICADA
document.addEventListener('click', function(e) {
    const chatItem = e.target.closest('.chat-item');
    
    if (!chatItem) {
        debugLog("Click fuera de chat-item");
        return;
    }
    
    debugLog("Chat-item clickeado:", {
        tipo: chatItem.dataset.tipo,
        chatId: chatItem.dataset.chat,
        elemento: chatItem
    });
    
    // Para móvil: ocultar lista y mostrar chat
    if (window.innerWidth <= 768) {
        const chatsPanel = document.getElementById('chatsPanel');
        const chatPanel = document.getElementById('chatPanel');
        
        if (chatsPanel && chatPanel) {
            chatsPanel.style.display = 'none';
            chatPanel.style.display = 'flex';
            debugLog("Modo móvil: mostrando chat");
        }
    }
    
    // Resaltar chat activo
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    chatItem.classList.add('active');
    
    // Ocultar "chat vacío" y mostrar mensajes
    const emptyChat = document.getElementById('emptyChat');
    const messagesContainer = document.getElementById('messagesContainer');
    const inputContainer = document.querySelector('.input-container');
    
    if (emptyChat) emptyChat.style.display = 'none';
    if (messagesContainer) messagesContainer.style.display = 'block';
    if (inputContainer) inputContainer.style.display = 'flex';
    
    // Manejar diferentes tipos de chat
    const tipo = chatItem.dataset.tipo;
    const chatId = chatItem.dataset.chat;
    
    if (tipo === 'grupo') {
        handleGrupoClick(chatItem, chatId);
    } else {
        handlePrivadoClick(chatItem, chatId);
    }
});

// Manejar click en grupo
async function handleGrupoClick(chatItem, chatId) {
    debugLog("Abriendo grupo:", chatId);
    
    const chatName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const userStatus = document.getElementById('userStatus');
    
    if (chatName) chatName.textContent = chatItem.querySelector('.chat-name')?.textContent || 'Grupo';
    if (userAvatar) userAvatar.innerHTML = '<i class="fas fa-users"></i>';
    if (userStatus) {
        userStatus.textContent = 'Grupo';
        userStatus.style.color = '#6c757d';
    }
    
    currentChatId = chatId;
    await loadMessages(chatId, document.getElementById('messagesContainer'));
}

// Manejar click en chat privado
async function handlePrivadoClick(chatItem, userId) {
    debugLog("Abriendo chat privado con:", userId);
    
    try {
        const response = await fetch('php/create_chat.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario2: userId })
        });
        
        const data = await response.json();
        debugLog("Respuesta create_chat.php:", data);
        
        if (!data.success) {
            console.error("Error al crear chat:", data.error);
            return;
        }
        
        // Actualizar interfaz
        const chatName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        const userStatus = document.getElementById('userStatus');
        
        if (chatName) chatName.textContent = chatItem.querySelector('.chat-name')?.textContent || 'Usuario';
        
        // Copiar avatar del item clickeado
        const itemAvatar = chatItem.querySelector('.chat-avatar');
        if (userAvatar && itemAvatar) {
            userAvatar.innerHTML = itemAvatar.innerHTML;
        }
        
        if (userStatus) {
            userStatus.textContent = 'En línea';
            userStatus.style.color = '#28a745';
        }
        
        currentChatId = data.id_chat;
        await loadMessages(currentChatId, document.getElementById('messagesContainer'));
        
    } catch (error) {
        console.error("Error al abrir chat privado:", error);
    }
}

// Cargar mensajes
async function loadMessages(chatId, container) {
    if (!container) {
        console.error("No hay container para mensajes");
        return;
    }
    
    try {
        debugLog("Cargando mensajes para chat:", chatId);
        const resp = await fetch(`php/get_message.php?id_chat=${chatId}&t=${Date.now()}`);
        
        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
        
        const mensajes = await resp.json();
        debugLog("Mensajes recibidos:", mensajes.length);
        
        container.innerHTML = "";
        
        mensajes.forEach(msg => {
            if (msg.cifrado == 1 && msg.tipo === "texto") {
                try {
                    msg.contenido = decodeURIComponent(escape(atob(msg.contenido)));
                } catch (e) {
                    console.error("Error al decodificar mensaje cifrado:", e);
                }
            }

            const div = document.createElement("div");
            div.classList.add("message", msg.id_usuario === currentUserId ? "sent" : "received");
            
            let content = msg.contenido;
            if (msg.tipo !== "texto" && content && !content.startsWith("http")) {
                content = `${window.location.origin}/onegoal_poi/${content}`;
            }

            const hora = new Date(msg.fecha_envio).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });

            let messageContent = "";

            switch (msg.tipo) {
                case "texto":
                    messageContent = `<div class="message-text">${sanitizeHTML(content)}</div>`;
                    break;
                case "imagen":
                    messageContent = `
                        <div class="message-image">
                            <img src="${content}" alt="imagen" onclick="window.open('${content}', '_blank')" />
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
                            <a href="${content}" target="_blank" download>📎 ${fileName}</a>
                        </div>`;
                    break;
                case "ubicacion":
                    let cleanContent = content;
                    if (cleanContent.startsWith("http")) {
                        const jsonStart = cleanContent.indexOf("{");
                        if (jsonStart !== -1) cleanContent = cleanContent.slice(jsonStart);
                    }

                    let obj;
                    try {
                        obj = JSON.parse(cleanContent);
                        if (obj.lat && obj.lng) {
                            const mapsURL = `https://www.google.com/maps?q=${obj.lat},${obj.lng}`;
                            messageContent = `
                                <div class="message-location">
                                    <a href="${mapsURL}" target="_blank">📍 Ver ubicación en Google Maps</a>
                                </div>`;
                        } else {
                            messageContent = `<div class="message-text">[Ubicación inválida]</div>`;
                        }
                    } catch (e) {
                        console.error("JSON ubicación inválido:", e, content);
                        messageContent = `<div class="message-text">[Error al mostrar ubicación]</div>`;
                    }
                    break;
                case "audio":
                    messageContent = `
                        <div class="message-audio">
                            <audio controls>
                                <source src="${content}" type="audio/wav">
                                Tu navegador no soporta audio.
                            </audio>
                        </div>`;
                    break;
            }

            div.innerHTML = `${messageContent}<div class="message-time">${hora}</div>`;
            container.appendChild(div);
        });

        container.scrollTop = container.scrollHeight;
        lastMessageCheck = Date.now();
        
    } catch (error) {
        console.error("Error al cargar mensajes:", error);
    }
}

// Funciones auxiliares
function sanitizeHTML(str) {
    const temp = document.createElement("div");
    temp.textContent = str;
    return temp.innerHTML;
}

function startMessagePolling() {
    setInterval(async () => {
        if (currentChatId) {
            await checkForNewMessages();
        }
    }, 3000);
}

async function checkForNewMessages() {
    if (!currentChatId) return;
    
    try {
        const resp = await fetch(`php/check_new_messages.php?chat_id=${currentChatId}&last_check=${lastMessageCheck}`);
        const data = await resp.json();
        
        if (data.has_new && data.new_messages) {
            lastMessageCheck = Date.now();
        }
    } catch (error) {
        console.error("Error verificando nuevos mensajes:", error);
    }
}

// Cargar usuarios
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

        if (userAvatar) {
            userAvatar.innerHTML = user.foto_perfil
                ? `<img src="${user.foto_perfil}" alt="Perfil" class="avatar-img">`
                : user.nombre.charAt(0).toUpperCase();
        }

        if (userName) userName.textContent = user.nombre;
        if (userStatus) {
            userStatus.textContent = user.estado_conexion === 'online' ? ' En línea' : ' Desconectado';
        }

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

// Cargar grupos
function cargarGruposUsuario() {
    fetch('php/grupo_chat.php')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                window.grupos = data.grupos;
                const groupsList = document.getElementById('groupsList');
                if (groupsList) {
                    groupsList.innerHTML = '';

                    data.grupos.forEach(g => {
                        const div = document.createElement('div');
                        div.classList.add('chat-item');
                        div.dataset.chat = g.id_grupo;
                        div.dataset.tipo = 'grupo';
                        div.dataset.estado = g.estado;

                        div.innerHTML = `
                            <div class="chat-avatar"><i class="fas fa-users"></i></div>
                            <div class="chat-info">
                                <div class="chat-name">${g.nombre}</div>
                                <div class="chat-last">${g.estado === 'Activo' ? 'Activo' : 'Inactivo'} — Creador: ${g.nombre_creador}</div>
                            </div>
                        `;
                        groupsList.appendChild(div);
                    });
                }
            }
        })
        .catch(err => console.error('Error cargando grupos:', err));
}

// Envío de mensajes
let cifradoActivo = false;
const lockBtn = document.getElementById("lockBtn");
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');

if (lockBtn) {
    lockBtn.addEventListener("click", () => {
        cifradoActivo = !cifradoActivo;
        lockBtn.style.color = cifradoActivo ? "fuchsia" : "";
    });
}

if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
}

if (messageInput) {
    messageInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

async function sendMessage() {
    const input = document.getElementById("messageInput");
    if (!input || !currentChatId) return;
    
    const contenido = input.value.trim();
    if (!contenido) return;

    const contenidoFinal = cifradoActivo
        ? btoa(unescape(encodeURIComponent(contenido)))
        : contenido;

    try {
        const resp = await fetch("php/send_message.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id_chat: currentChatId,
                id_usuario: currentUserId,
                contenido: contenidoFinal,
                tipo: "texto",
                cifrado: cifradoActivo ? 1 : 0
            })
        });
        const data = await resp.json();
        if (data?.success) {
            input.value = "";
            const messagesContainer = document.getElementById("messagesContainer");
            if (messagesContainer) {
                await loadMessages(currentChatId, messagesContainer);
            }
        } else {
            console.error("Error al enviar mensaje:", data?.error);
        }
    } catch (err) {
        console.error("Error en envío:", err);
    }
}

if (attachBtn) {
    attachBtn.addEventListener('click', () => {
        if (fileInput) fileInput.click();
    });
}

if (fileInput) {
    fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];
        if (!file || !currentChatId) return;

        let tipo = "archivo";
        const mime = file.type;
        if (mime.startsWith("image/")) tipo = "imagen";
        else if (mime.startsWith("video/")) tipo = "video";
        else if (mime.startsWith("audio/")) tipo = "audio";

        await sendFileMessage(currentChatId, currentUserId, file, tipo);
    });
}

async function sendFileMessage(id_chat, id_usuario, file, tipo) {
    const formData = new FormData();
    formData.append("id_chat", id_chat);
    formData.append("id_usuario", id_usuario);
    formData.append("tipo", tipo);
    formData.append("archivo", file);
    formData.append("cifrado", cifradoActivo ? 1 : 0);

    try {
        const resp = await fetch("php/send_message.php", {
            method: "POST",
            body: formData
        });

        const result = await resp.json();
        if (result.success) {
            const messagesContainer = document.getElementById("messagesContainer");
            if (messagesContainer) {
                await loadMessages(currentChatId, messagesContainer);
            }
        } else {
            alert("Error al enviar archivo: " + (result.error || "Desconocido"));
        }
    } catch (error) {
        console.error("Error al enviar archivo:", error);
    }
}

// Botones de filtro (Conversaciones, Grupos, Llamadas)
document.querySelectorAll('.round-button').forEach(button => {
    button.addEventListener('click', function () {
        document.querySelectorAll('.round-button').forEach(btn => {
            btn.classList.remove('active');
        });
        this.classList.add('active');

        const conversationsList = document.getElementById('conversationsList');
        const groupsList = document.getElementById('groupsList');
        const callsList = document.getElementById('callsList');

        if (conversationsList) conversationsList.style.display = 'none';
        if (groupsList) groupsList.style.display = 'none';
        if (callsList) callsList.style.display = 'none';

        if (this.textContent === 'Conversaciones' && conversationsList) {
            conversationsList.style.display = 'block';
        } else if (this.textContent === 'Grupos' && groupsList) {
            groupsList.style.display = 'block';
        } else if (this.textContent === 'Llamadas' && callsList) {
            callsList.style.display = 'block';
        }
    });
});

// Ubicación
const ubicacionBtn = document.getElementById("Ubicacion");
if (ubicacionBtn) {
    ubicacionBtn.addEventListener("click", () => {
        if (!navigator.geolocation) {
            alert("Geolocalización no soportada");
            return;
        }

        if (!currentChatId) {
            alert("Selecciona un chat primero");
            return;
        }

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const accuracy = pos.coords.accuracy;

            const contenido = JSON.stringify({ lat, lng, accuracy });

            try {
                const resp = await fetch("php/send_message.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id_chat: currentChatId,
                        id_usuario: currentUserId,
                        contenido,
                        tipo: "ubicacion"
                    })
                });
                const data = await resp.json();
                if (data?.success) {
                    const messagesContainer = document.getElementById("messagesContainer");
                    if (messagesContainer) {
                        await loadMessages(currentChatId, messagesContainer);
                    }
                }
            } catch (err) {
                console.error("Error en envío de ubicación:", err);
            }
        }, (err) => {
            console.error(err);
            alert("No se pudo obtener la ubicación");
        });
    });
}

// Función para obtener chat seleccionado (si la necesitas)
function obtenerChatSeleccionado() {
    if (!currentChatId) return null;
    
    const activeItem = document.querySelector('.chat-item.active');
    if (activeItem) {
        return {
            tipo: activeItem.dataset.tipo,
            id_chat: currentChatId,
            id_grupo: activeItem.dataset.tipo === 'grupo' ? currentChatId : null
        };
    }
    
    return { tipo: 'privado', id_chat: currentChatId };
}