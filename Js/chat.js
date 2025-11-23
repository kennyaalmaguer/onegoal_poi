let currentChatId = null;
let currentUserId = null;
let lastMessageCheck = 0;
let usuarios = [];
let userAvatarMap = {};
let cifradoActivo = false;

// Variables para llamadas
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let isCallActive = false;
let callStartTime = null;
let callTimer = null;

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

    // ✅ CARGAR DATOS - Contactos ordenados por último mensaje
    cargarYOrdenarContactos();
    cargarGruposUsuario();
    startMessagePolling();
    
    // Configurar event listeners para envío de mensajes
    configurarEventListenersMensajes();
    
    // ✅ CONFIGURAR SISTEMA DE LLAMADAS
    configurarLlamadas();
    
    debugLog("Inicialización completada");
    
    // ✅ Para testing - simular llamada entrante después de 5 segundos
    // setTimeout(() => simularLlamadaEntrante('voz'), 5000);
});

// ✅ FUNCIÓN: Cargar y ordenar contactos por último mensaje
async function cargarYOrdenarContactos() {
    try {
        const resp = await fetch('php/get_users.php');
        const data = await resp.json();

        if (!data.success) {
            console.error("Error al cargar usuarios:", data.message);
            return;
        }

        const user = data.current_user;
        currentUserId = user.id_usuario;

        // Actualizar info del usuario actual
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

        // ✅ Obtener información de últimos mensajes para cada usuario
        const usuariosConUltimoMensaje = await Promise.all(
            usuarios.map(async (usuario) => {
                if (usuario.id_usuario === currentUserId) return null;
                
                const ultimoMensaje = await obtenerUltimoMensajeConUsuario(usuario.id_usuario);
                return {
                    ...usuario,
                    ultimoMensaje: ultimoMensaje
                };
            })
        );

        // Filtrar nulos y ordenar por fecha del último mensaje (más reciente primero)
        const usuariosOrdenados = usuariosConUltimoMensaje
            .filter(u => u !== null)
            .sort((a, b) => {
                // Si ambos tienen mensajes, ordenar por fecha (más reciente primero)
                if (a.ultimoMensaje && b.ultimoMensaje) {
                    return new Date(b.ultimoMensaje.fecha_envio) - new Date(a.ultimoMensaje.fecha_envio);
                }
                // Si solo A tiene mensajes, A primero
                if (a.ultimoMensaje && !b.ultimoMensaje) return -1;
                // Si solo B tiene mensajes, B primero
                if (!a.ultimoMensaje && b.ultimoMensaje) return 1;
                // Si ninguno tiene mensajes, ordenar alfabéticamente
                return a.nombre.localeCompare(b.nombre);
            });

        // Mostrar usuarios ordenados
        mostrarUsuariosEnLista(usuariosOrdenados);

        // Guardar mapa de avatares
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

// ✅ FUNCIÓN: Obtener último mensaje con un usuario específico
async function obtenerUltimoMensajeConUsuario(idUsuarioDestino) {
    try {
        // Primero obtener el chat_id
        const responseChat = await fetch('php/create_chat.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario2: idUsuarioDestino })
        });
        
        const dataChat = await responseChat.json();
        if (!dataChat.success) return null;

        // Luego obtener los mensajes de ese chat
        const responseMensajes = await fetch(`php/get_message.php?id_chat=${dataChat.id_chat}&limit=1`);
        const mensajes = await responseMensajes.json();

        if (mensajes && mensajes.length > 0) {
            return mensajes[0];
        }
        
        return null;
    } catch (error) {
        console.error("Error obteniendo último mensaje:", error);
        return null;
    }
}

// ✅ FUNCIÓN: Mostrar usuarios en la lista con info de último mensaje
function mostrarUsuariosEnLista(usuariosArray) {
    const conversationsList = document.getElementById('conversationsList');
    if (!conversationsList) return;

    conversationsList.innerHTML = '';

    usuariosArray.forEach(user => {
        const div = document.createElement('div');
        div.classList.add('chat-item');
        div.dataset.chat = user.id_usuario;
        div.dataset.tipo = 'usuario';
        div.dataset.estado_conexion = user.estado_conexion;

        // Información del último mensaje
        let previewText = 'Haz clic para chatear';
        let timeText = '';
        
        if (user.ultimoMensaje) {
            const mensaje = user.ultimoMensaje;
            
            // Formatear preview del mensaje
            if (mensaje.cifrado == 1 && mensaje.tipo === "texto") {
                try {
                    mensaje.contenido = decodeURIComponent(escape(atob(mensaje.contenido)));
                } catch (e) {
                    console.error("Error decodificando preview:", e);
                }
            }

            switch (mensaje.tipo) {
                case 'texto':
                    previewText = mensaje.contenido.length > 30 
                        ? mensaje.contenido.substring(0, 30) + '...' 
                        : mensaje.contenido;
                    break;
                case 'imagen':
                    previewText = '📷 Imagen';
                    break;
                case 'video':
                    previewText = '🎥 Video';
                    break;
                case 'audio':
                    previewText = '🎵 Audio';
                    break;
                case 'archivo':
                    previewText = '📎 Archivo';
                    break;
                case 'ubicacion':
                    previewText = '📍 Ubicación';
                    break;
                default:
                    previewText = 'Nuevo mensaje';
            }

            // Formatear hora
            const mensajeDate = new Date(mensaje.fecha_envio);
            const ahora = new Date();
            const diferencia = ahora - mensajeDate;
            const unDia = 24 * 60 * 60 * 1000;

            if (diferencia < unDia) {
                // Menos de 24 horas: mostrar hora
                timeText = mensajeDate.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            } else {
                // Más de 24 horas: mostrar fecha
                timeText = mensajeDate.toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric'
                });
            }
        }

        // Indicador de quién envió el último mensaje
        if (user.ultimoMensaje && user.ultimoMensaje.id_usuario === currentUserId) {
            previewText = 'Tú: ' + previewText;
        }

        div.innerHTML = `
            <div class="chat-avatar">
                ${user.foto_perfil
                    ? `<img src="${user.foto_perfil}" alt="${user.nombre}" class="avatar-img">`
                    : user.nombre[0]}
                ${user.estado_conexion === 'online' ? '<div class="online-indicator"></div>' : ''}
            </div>
            <div class="chat-info">
                <div class="chat-name">${user.nombre}</div>
                <div class="chat-preview">${previewText}</div>
            </div>
            <div class="chat-time">${timeText}</div>
        `;

        conversationsList.appendChild(div);
    });

    // Si no hay usuarios, mostrar mensaje
    if (conversationsList.children.length === 0) {
        conversationsList.innerHTML = '<div class="empty-list">No hay contactos disponibles</div>';
    }
}

// MANEJADOR DE CLICS EN CHATS
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
    
    // ✅ Cargar historial de llamadas cuando se selecciona un chat
    setTimeout(() => {
        cargarHistorialLlamadas();
    }, 1000);
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
        idUsuarioDestino = userId;
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

// Cargar grupos
function cargarGruposUsuario() {
    fetch('php/grupo_chat.php')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                window.grupos = data.grupos;
                const groupsList = document.getElementById('groupsList');
                
                if (groupsList) {
                    if (data.grupos.length === 0) {
                        groupsList.innerHTML = '<div class="empty-list">No perteneces a ningún grupo</div>';
                        return;
                    }

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
                                <div class="chat-last">
                                    ${g.estado === 'Activo' ? '🟢 Activo' : '🔴 Inactivo'} 
                                    — Creador: ${g.nombre_creador}
                                </div>
                            </div>
                        `;
                        groupsList.appendChild(div);
                    });
                }
            } else {
                console.error('Error cargando grupos:', data.message);
                const groupsList = document.getElementById('groupsList');
                if (groupsList) {
                    groupsList.innerHTML = '<div class="empty-list">Error al cargar grupos</div>';
                }
            }
        })
        .catch(err => {
            console.error('Error cargando grupos:', err);
            const groupsList = document.getElementById('groupsList');
            if (groupsList) {
                groupsList.innerHTML = '<div class="empty-list">Error de conexión</div>';
            }
        });
}

// ✅ FUNCIÓN: Configurar event listeners para mensajes
function configurarEventListenersMensajes() {
    const lockBtn = document.getElementById("lockBtn");
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');
    const searchBox = document.querySelector('.search-box');
    const ubicacionBtn = document.getElementById("Ubicacion");

    // Cifrado
    if (lockBtn) {
        lockBtn.addEventListener("click", () => {
            cifradoActivo = !cifradoActivo;
            lockBtn.style.color = cifradoActivo ? "fuchsia" : "";
        });
    }

    // Envío de mensajes
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

    // Adjuntar archivos
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

    // Búsqueda
    if (searchBox) {
        searchBox.addEventListener('input', function () {
            const query = this.value.toLowerCase();
            
            if (query === '') {
                // Si está vacío, recargar contactos ordenados
                cargarYOrdenarContactos();
            } else {
                // Si hay búsqueda, filtrar del array actual
                const filtered = usuarios.filter(u => 
                    u.nombre.toLowerCase().includes(query) && u.id_usuario !== currentUserId
                );
                mostrarUsuariosEnLista(filtered);
            }
        });
    }

    // Ubicación
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
                        // Recargar lista para actualizar orden
                        cargarYOrdenarContactos();
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
}

// Envío de mensajes de texto
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
            // ✅ Recargar la lista para actualizar el orden
            cargarYOrdenarContactos();
        } else {
            console.error("Error al enviar mensaje:", data?.error);
        }
    } catch (err) {
        console.error("Error en envío:", err);
    }
}

// Envío de archivos
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
            // ✅ Recargar la lista para actualizar el orden
            cargarYOrdenarContactos();
        } else {
            alert("Error al enviar archivo: " + (result.error || "Desconocido"));
        }
    } catch (error) {
        console.error("Error al enviar archivo:", error);
    }
}

// ==================== SISTEMA DE LLAMADAS ====================

// ✅ CONFIGURAR EVENT LISTENERS PARA LLAMADAS
function configurarLlamadas() {
    const voiceCallBtn = document.getElementById('voiceCallBtn');
    const videoCallBtn = document.getElementById('videoCallBtn');
    const hangupVoiceCall = document.getElementById('hangupVoiceCall');
    const hangupVideoCall = document.getElementById('hangupVideoCall');
    const acceptCall = document.getElementById('acceptCall');
    const declineCall = document.getElementById('declineCall');

    // Llamada de voz
    if (voiceCallBtn) {
        voiceCallBtn.addEventListener('click', iniciarLlamadaVoz);
    }

    // Videollamada
    if (videoCallBtn) {
        videoCallBtn.addEventListener('click', iniciarVideoLlamada);
    }

    // Colgar llamada
    if (hangupVoiceCall) {
        hangupVoiceCall.addEventListener('click', colgarLlamada);
    }

    if (hangupVideoCall) {
        hangupVideoCall.addEventListener('click', colgarLlamada);
    }

    // Aceptar/rechazar llamada entrante
    if (acceptCall) {
        acceptCall.addEventListener('click', aceptarLlamada);
    }

    if (declineCall) {
        declineCall.addEventListener('click', rechazarLlamada);
    }
}

// ✅ INICIAR LLAMADA DE VOZ
async function iniciarLlamadaVoz() {
    if (!currentChatId || !idUsuarioDestino) {
        alert('Selecciona un chat primero');
        return;
    }

    try {
        // Guardar llamada saliente
        await guardarLlamada('voz', 'saliente');
        
        // Mostrar modal de llamada
        mostrarModalLlamadaSaliente('voz');
        
        // Iniciar lógica WebRTC (simulada por ahora)
        await iniciarWebRTC('voz');
        
    } catch (error) {
        console.error('Error iniciando llamada:', error);
        alert('Error al iniciar la llamada');
    }
}

// ✅ INICIAR VIDEOLLAMADA
async function iniciarVideoLlamada() {
    if (!currentChatId || !idUsuarioDestino) {
        alert('Selecciona un chat primero');
        return;
    }

    try {
        // Guardar llamada saliente
        await guardarLlamada('video', 'saliente');
        
        // Mostrar modal de videollamada
        mostrarModalLlamadaSaliente('video');
        
        // Iniciar WebRTC con video
        await iniciarWebRTC('video');
        
    } catch (error) {
        console.error('Error iniciando videollamada:', error);
        alert('Error al iniciar la videollamada');
    }
}

// ✅ MOSTRAR MODAL DE LLAMADA SALIENTE
function mostrarModalLlamadaSaliente(tipo) {
    const modal = tipo === 'video' ? 
        document.getElementById('videoCallModal') : 
        document.getElementById('voiceCallModal');
    
    if (modal) {
        modal.style.display = 'flex';
        iniciarTemporizadorLlamada();
        isCallActive = true;
        
        // Actualizar información del contacto
        const activeChat = document.querySelector('.chat-item.active');
        if (activeChat) {
            const nombre = activeChat.querySelector('.chat-name')?.textContent || 'Contacto';
            const avatarElement = modal.querySelector('.caller-avatar');
            if (avatarElement) {
                avatarElement.textContent = nombre.charAt(0).toUpperCase();
            }
            const nameElement = modal.querySelector('h2');
            if (nameElement) {
                nameElement.textContent = nombre;
            }
        }
    }
}

// ✅ INICIAR WEBRTC (SIMULADO)
async function iniciarWebRTC(tipo) {
    try {
        // Obtener stream local
        const constraints = {
            audio: true,
            video: tipo === 'video'
        };
        
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (tipo === 'video') {
            const localVideo = document.getElementById('localVideo');
            if (localVideo) {
                localVideo.srcObject = localStream;
            }
            // Ocultar placeholder
            const localPlaceholder = document.getElementById('localPlaceholder');
            if (localPlaceholder) localPlaceholder.style.display = 'none';
        }
        
        // Simular llamada exitosa después de 3 segundos
        setTimeout(() => {
            if (isCallActive) {
                const statusElement = tipo === 'video' ? 
                    document.getElementById('videoCallStatus') : 
                    document.getElementById('voiceCallStatus');
                if (statusElement) statusElement.textContent = 'En llamada';
            }
        }, 3000);
        
    } catch (error) {
        console.error('Error accediendo a medios:', error);
        alert('No se pudo acceder a la cámara/micrófono');
        colgarLlamada();
    }
}

// ✅ COLGAR LLAMADA
function colgarLlamada() {
    const voiceModal = document.getElementById('voiceCallModal');
    const videoModal = document.getElementById('videoCallModal');
    
    if (voiceModal) voiceModal.style.display = 'none';
    if (videoModal) videoModal.style.display = 'none';
    
    detenerTemporizadorLlamada();
    isCallActive = false;
    
    // Guardar duración de la llamada
    if (callStartTime) {
        const duracion = calcularDuracionLlamada();
        actualizarDuracionLlamada(duracion);
    }
    
    // Detener streams
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }
}

// ✅ ACEPTAR LLAMADA ENTRANTE
function aceptarLlamada() {
    const incomingModal = document.getElementById('incomingCallModal');
    if (incomingModal) incomingModal.style.display = 'none';
    
    // Determinar tipo de llamada y mostrar modal correspondiente
    const tipoLlamada = 'video'; // Esto debería venir del servidor
    mostrarModalLlamadaSaliente(tipoLlamada);
    
    // Actualizar estado a "contestada"
    actualizarEstadoLlamada('entrante');
}

// ✅ RECHAZAR LLAMADA ENTRANTE
function rechazarLlamada() {
    const incomingModal = document.getElementById('incomingCallModal');
    if (incomingModal) incomingModal.style.display = 'none';
    
    // Actualizar estado a "perdida"
    actualizarEstadoLlamada('perdida');
    detenerTemporizadorLlamada();
}

// ✅ SIMULAR LLAMADA ENTRANTE (PARA TESTING)
function simularLlamadaEntrante(tipo = 'voz') {
    const incomingModal = document.getElementById('incomingCallModal');
    if (incomingModal) {
        // Actualizar información del llamante
        const callerAvatar = document.getElementById('incomingCallerAvatar');
        const callerName = document.querySelector('#incomingCallModal h2');
        const activeChat = document.querySelector('.chat-item.active');
        
        if (activeChat && callerName) {
            const nombre = activeChat.querySelector('.chat-name')?.textContent || 'Contacto';
            callerName.textContent = nombre;
            if (callerAvatar) {
                callerAvatar.textContent = nombre.charAt(0).toUpperCase();
            }
        }
        
        incomingModal.style.display = 'flex';
        
        // Auto-rechazar después de 30 segundos
        setTimeout(() => {
            if (incomingModal.style.display === 'flex') {
                rechazarLlamada();
            }
        }, 30000);
    }
}

// ✅ TEMPORIZADOR DE LLAMADA
function iniciarTemporizadorLlamada() {
    callStartTime = new Date();
    callTimer = setInterval(() => {
        if (callStartTime) {
            const duracion = calcularDuracionLlamada();
            actualizarTemporizadorUI(duracion);
        }
    }, 1000);
}

function detenerTemporizadorLlamada() {
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    callStartTime = null;
}

function calcularDuracionLlamada() {
    if (!callStartTime) return '00:00';
    
    const ahora = new Date();
    const diferencia = Math.floor((ahora - callStartTime) / 1000);
    const minutos = Math.floor(diferencia / 60);
    const segundos = diferencia % 60;
    
    return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
}

function actualizarTemporizadorUI(duracion) {
    // Actualizar en ambos modales
    const voiceStatus = document.getElementById('voiceCallStatus');
    const videoStatus = document.getElementById('videoCallStatus');
    
    if (voiceStatus) voiceStatus.textContent = duracion;
    if (videoStatus) videoStatus.textContent = duracion;
}

// ==================== BASE DE DATOS LLAMADAS ====================

// ✅ GUARDAR LLAMADA EN BASE DE DATOS
async function guardarLlamada(tipo, estado) {
    try {
        const response = await fetch('php/guardar_llamada.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_chat: currentChatId,
                id_grupo: null,
                idUsuarioEmisor: currentUserId,
                idUsuarioReceptor: idUsuarioDestino,
                tipo: tipo,
                estado: estado,
                duracion: null
            })
        });
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error guardando llamada:', error);
        return false;
    }
}

// ✅ ACTUALIZAR DURACIÓN DE LLAMADA
async function actualizarDuracionLlamada(duracion) {
    console.log('Duración de llamada:', duracion);
    // Aquí iría la lógica para actualizar en la base de datos
}

// ✅ ACTUALIZAR ESTADO DE LLAMADA
async function actualizarEstadoLlamada(nuevoEstado) {
    console.log('Actualizando estado a:', nuevoEstado);
    // Similar a guardarLlamada pero para actualizar estado
}

// ==================== HISTORIAL DE LLAMADAS ====================

// ✅ CARGAR HISTORIAL DE LLAMADAS
async function cargarHistorialLlamadas() {
    try {
        if (!currentChatId) return;

        const response = await fetch(`php/get_llamadas.php?chatId=${currentChatId}`);
        const data = await response.json();

        if (data.success) {
            mostrarHistorialLlamadas(data.llamadas);
        }
    } catch (error) {
        console.error('Error cargando historial:', error);
    }
}

// ✅ MOSTRAR HISTORIAL EN LISTA DE LLAMADAS
function mostrarHistorialLlamadas(llamadas) {
    const callsList = document.getElementById('callsList');
    if (!callsList) return;

    callsList.innerHTML = '';

    if (!llamadas || llamadas.length === 0) {
        callsList.innerHTML = '<div class="empty-list">No hay llamadas recientes</div>';
        return;
    }

    llamadas.forEach(llamada => {
        const item = document.createElement('div');
        item.classList.add('call-item');
        
        const nombre = llamada.nombre_emisor || 'Usuario';
        const inicial = nombre.charAt(0).toUpperCase();
        const tipo = llamada.tipo === 'video' ? 'Videollamada' : 'Llamada';
        const estado = llamada.estado_visual || llamada.estado;
        
        let icono = llamada.tipo === 'video' ? 'fa-video' : 'fa-phone';
        let colorEstado = '#6c757d';
        
        switch (estado) {
            case 'entrante':
                colorEstado = '#28a745';
                break;
            case 'saliente':
                colorEstado = '#007bff';
                break;
            case 'perdida':
                colorEstado = '#dc3545';
                break;
        }

        item.innerHTML = `
            <div class="call-avatar">
                ${inicial}
            </div>
            <div class="call-info">
                <div class="call-name">${nombre}</div>
                <div class="call-details" style="color:${colorEstado}">
                    <i class="fas ${icono}"></i>
                    <span>${tipo} • ${estado.charAt(0).toUpperCase() + estado.slice(1)}</span>
                </div>
            </div>
            <div class="call-time">${formatearFecha(llamada.fecha)}</div>
        `;

        callsList.appendChild(item);
    });
}

function formatearFecha(fechaString) {
    const fecha = new Date(fechaString);
    const ahora = new Date();
    const diferencia = ahora - fecha;
    const unDia = 24 * 60 * 60 * 1000;

    if (diferencia < unDia) {
        return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diferencia < 7 * unDia) {
        return fecha.toLocaleDateString([], { weekday: 'short' });
    } else {
        return fecha.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

// ==================== BOTONES DE FILTRO ====================

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
            cargarHistorialLlamadas();
        }
    });
});

// Función para obtener chat seleccionado
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