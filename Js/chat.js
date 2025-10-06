// Elementos principales
const chatsPanel = document.getElementById('chatsPanel');
const chatPanel = document.getElementById('chatPanel');
const backButton = document.getElementById('backButton');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const recordBtn = document.getElementById('recordBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');

// Variables para grabación de audio
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// Variables para la videollamada
let localStream = null;
let remoteStream = null;

// Funcionalidad para cambiar entre chats
document.querySelectorAll('.chat-item').forEach(item => {
  item.addEventListener('click', async function () {
    if (window.innerWidth <= 768) {
      chatsPanel.style.display = 'none';
      chatPanel.classList.add('active');
    }

    document.querySelectorAll('.chat-item').forEach(chat => chat.classList.remove('active'));
    this.classList.add('active');

    const idUsuario = this.getAttribute('data-chat');
    const nombre = this.querySelector('.chat-name').textContent;

    // Tomar foto si existe
    const avatarImg = this.querySelector('.chat-avatar img');
    const avatarHtml = avatarImg
      ? `<img src="${avatarImg.src}" alt="${nombre}" class="avatar-img">`
      : this.querySelector('.chat-avatar').textContent.trim();

    // Actualizar encabezado del chat
    const chatAvatar = document.getElementById('chatAvatar');
    const chatName = document.getElementById('chatName');
    chatAvatar.innerHTML = avatarHtml;
    chatName.textContent = nombre;

    // Cargar mensajes desde el backend
    await loadChatMessages(idUsuario);
  });
});

// Botón de regreso
backButton.addEventListener('click', function() {
    if (window.innerWidth <= 768) {
        chatsPanel.style.display = 'flex';
        chatPanel.classList.remove('active');
    }
});

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
async function updateChatConversation(chatType) {
    const chatId = getChatIdFromType(chatType); // función que mapee chatType → id_chat
    messagesContainer.innerHTML = "<p>Cargando mensajes...</p>";

    try {
        const response = await fetch(`get_messages.php?id_chat=${chatId}`);
        const messages = await response.json();

        messagesContainer.innerHTML = '';

        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', msg.id_usuario == currentUserId ? 'sent' : 'received');

            messageDiv.innerHTML = `
                <div class="message-text">${msg.contenido}</div>
                <div class="message-time">${new Date(msg.fecha_envio).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
            `;

            messagesContainer.appendChild(messageDiv);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error("Error al cargar mensajes:", error);
    }
}
// --- Envío de mensajes ---
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const messageText = messageInput.value.trim();
    if (!messageText) return;

    const data = {
        id_chat: currentChatId,
        id_usuario: currentUserId,
        contenido: messageText,
        tipo: 'texto'
    };

    // Mostrarlo inmediatamente
    renderMessage(messageText, 'sent');

    // Guardarlo en la base
    await fetch('send_message.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });

    messageInput.value = '';
}
function simulateReply() {
    const replies = [
        "¡Interesante!",
        "No lo había pensado así",
        "¿Podrías explicarme más?",
        "Estoy de acuerdo contigo",
        "¿Qué opinas del Mundial 2026?",
        "Eso suena genial"
    ];
    
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    const currentTime = new Date();
    const timeString = currentTime.getHours() + ':' + 
                      (currentTime.getMinutes() < 10 ? '0' : '') + 
                      currentTime.getMinutes();
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message received';
    messageElement.innerHTML = `
        <div class="message-text">${randomReply}</div>
        <div class="message-time">${timeString}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    
    // Hacer scroll al final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// --- Grabación de audio ---
recordBtn.replaceWith(recordBtn.cloneNode(true));
document.getElementById('recordBtn').addEventListener('click', toggleRecording);

async function toggleRecording() {
    if (!isRecording) {
        // Iniciar grabación
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                sendAudioMessage(audioBlob);
            };
            
            mediaRecorder.start();
            isRecording = true;
            recordBtn.classList.add('recording');
            recordBtn.innerHTML = '<i class="fas fa-stop"></i>';
        } catch (error) {
            console.error('Error al acceder al micrófono:', error);
            alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
        }
    } else {
        // Detener grabación
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            isRecording = false;
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        }
    }
}

function sendAudioMessage(audioBlob) {
    const currentTime = new Date();
    const timeString = currentTime.getHours() + ':' + 
                      (currentTime.getMinutes() < 10 ? '0' : '') + 
                      currentTime.getMinutes();
    
    // Crear URL para el audio
    const audioUrl = URL.createObjectURL(audioBlob);
    let audioElement = null;
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message sent audio-message';
    messageElement.innerHTML = `
        <div class="audio-player">
            <i class="fas fa-play play-audio"></i>
            <span>Audio</span>
            <span class="audio-duration">0:05</span>
        </div>
        <div class="message-time">${timeString}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    
    // Añadir evento para reproducir el audio
    const playButton = messageElement.querySelector('.play-audio');
    
    playButton.addEventListener('click', function() {
        if (!audioElement) {
            audioElement = new Audio(audioUrl);
        }
        
        if (audioElement.paused) {
            audioElement.play();
            this.className = 'fas fa-pause play-audio';
            
            audioElement.onended = () => {
                this.className = 'fas fa-play play-audio';
            };
        } else {
            audioElement.pause();
            audioElement.currentTime = 0;
            this.className = 'fas fa-play play-audio';
        }
    });
    
    // Hacer scroll al final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Simular respuesta después de un tiempo
    setTimeout(simulateReply, 1000 + Math.random() * 3000);
}

// --- Adjuntar archivos ---
attachBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        sendFileMessage(this.files[0]);
        this.value = ''; // Resetear el input
    }
});

function sendFileMessage(file) {
    const currentTime = new Date();
    const timeString = currentTime.getHours() + ':' + 
                      (currentTime.getMinutes() < 10 ? '0' : '') + 
                      currentTime.getMinutes();
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    let fileIcon = 'fa-file';
    
    // Determinar el icono según el tipo de archivo
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExtension)) {
        fileIcon = 'fa-file-image';
    } else if (['pdf'].includes(fileExtension)) {
        fileIcon = 'fa-file-pdf';
    } else if (['doc', 'docx'].includes(fileExtension)) {
        fileIcon = 'fa-file-word';
    } else if (['xls', 'xlsx'].includes(fileExtension)) {
        fileIcon = 'fa-file-excel';
    } else if (['mp3', 'wav', 'ogg'].includes(fileExtension)) {
        fileIcon = 'fa-file-audio';
    } else if (['mp4', 'avi', 'mov'].includes(fileExtension)) {
        fileIcon = 'fa-file-video';
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message sent file-message';
    messageElement.innerHTML = `
        <div class="file-attachment">
            <i class="fas ${fileIcon}"></i>
            <div class="file-info">
                <span class="file-name">${file.name}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
            </div>
        </div>
        <div class="message-time">${timeString}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    
    // Hacer scroll al final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Simular respuesta después de un tiempo
    setTimeout(simulateReply, 1000 + Math.random() * 3000);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// --- Funcionalidad de llamadas ---
const voiceCallBtn = document.getElementById('voiceCallBtn');
const videoCallBtn = document.getElementById('videoCallBtn');
const voiceCallModal = document.getElementById('voiceCallModal');
const videoCallModal = document.getElementById('videoCallModal');
const incomingCallModal = document.getElementById('incomingCallModal');

// Llamada de voz
voiceCallBtn.addEventListener('click', () => {
    voiceCallModal.style.display = 'flex';
});

// Videollamada
videoCallBtn.addEventListener('click', async () => {
    videoCallModal.style.display = 'flex';
    await startVideoCall();
});

// Función para iniciar videollamada
async function startVideoCall() {
    try {
        // Obtener acceso a cámara y micrófono
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }, 
            audio: true 
        });
        
        // Mostrar video local
        const localVideo = document.getElementById('localVideo');
        const localPlaceholder = document.getElementById('localPlaceholder');
        localVideo.srcObject = localStream;
        localVideo.style.display = 'block';
        localPlaceholder.style.display = 'none';
        
        // Simular video remoto (en una app real esto vendría del otro usuario)
        simulateRemoteVideo();
        
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        alert('No se pudo acceder a la cámara. Usando vista previa.');
        // Mantener placeholders si falla
    }
}

// Función para simular video remoto (en una app real esto sería una conexión real)
function simulateRemoteVideo() {
    const remoteVideo = document.getElementById('remoteVideo');
    const remotePlaceholder = document.getElementById('remotePlaceholder');
    
    // En una aplicación real, aquí conectarías con el stream del otro usuario
    // Por ahora mostramos el placeholder
    remoteVideo.style.display = 'none';
    remotePlaceholder.style.display = 'flex';
}

// Colgar llamada de voz
document.getElementById('hangupVoiceCall').addEventListener('click', () => {
    voiceCallModal.style.display = 'none';
});

// Colgar videollamada
document.getElementById('hangupVideoCall').addEventListener('click', () => {
    stopVideoCall();
    videoCallModal.style.display = 'none';
});

// Función para detener la videollamada
function stopVideoCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Ocultar videos y mostrar placeholders
    document.getElementById('localVideo').style.display = 'none';
    document.getElementById('localPlaceholder').style.display = 'flex';
    document.getElementById('remoteVideo').style.display = 'none';
    document.getElementById('remotePlaceholder').style.display = 'flex';
}

// Simular llamada entrante después de 5 segundos (para demostración)
setTimeout(() => {
    // incomingCallModal.style.display = 'flex';
}, 5000);

// Aceptar llamada entrante
document.getElementById('acceptCall').addEventListener('click', () => {
    incomingCallModal.style.display = 'none';
    voiceCallModal.style.display = 'flex';
});

// Rechazar llamada entrante
document.getElementById('declineCall').addEventListener('click', () => {
    incomingCallModal.style.display = 'none';
});

// Control de mute en llamada de voz
document.getElementById('muteBtn').addEventListener('click', function() {
    this.classList.toggle('active');
    const icon = this.querySelector('i');
    if (this.classList.contains('active')) {
        icon.className = 'fas fa-microphone-slash';
    } else {
        icon.className = 'fas fa-microphone';
    }
});

// Control de speaker en llamada de voz
document.getElementById('speakerBtn').addEventListener('click', function() {
    this.classList.toggle('active');
});

// Control de video en videollamada
document.getElementById('videoMuteBtn').addEventListener('click', function() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            this.classList.toggle('active');
            const icon = this.querySelector('i');
            icon.className = videoTrack.enabled ? 'fas fa-video' : 'fas fa-video-slash';
            
            // Mostrar u ocultar el placeholder según el estado de la cámara
            const localVideo = document.getElementById('localVideo');
            const localPlaceholder = document.getElementById('localPlaceholder');
            
            if (videoTrack.enabled) {
                // Mostrar video
                localVideo.style.display = 'block';
                localPlaceholder.style.display = 'none';
            } else {
                // Mostrar placeholder con perfil
                localVideo.style.display = 'none';
                localPlaceholder.style.display = 'flex';
            }
        }
    }
});

// Control de audio en videollamada
document.getElementById('videoAudioMuteBtn').addEventListener('click', function() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            this.classList.toggle('active');
            const icon = this.querySelector('i');
            icon.className = audioTrack.enabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
        }
    }
});

// Control de speaker en videollamada
document.getElementById('videoSpeakerBtn').addEventListener('click', function() {
    this.classList.toggle('active');
});

// --- Funcionalidad para crear grupos ---
const createGroupBtn = document.getElementById('createGroupBtn');
const createGroupModal = document.getElementById('createGroupModal');
const confirmCreateGroup = document.getElementById('confirmCreateGroup');

createGroupBtn.addEventListener('click', () => {
    createGroupModal.style.display = 'flex';
});

confirmCreateGroup.addEventListener('click', () => {
    // Redirigir a la página de creación de grupos
    window.location.href = 'grupos.html';
});

// Manejar cambios de tamaño de ventana
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        // En pantallas grandes, mostrar ambos paneles
        chatsPanel.style.display = 'flex';
        chatsPanel.style.width = '35%';
        chatPanel.style.display = 'flex';
        chatPanel.style.width = '65%';
        chatPanel.style.position = 'relative';
    } else {
        // En pantallas pequeñas, ajustar para vista móvil
        chatsPanel.style.width = '100%';
        chatPanel.style.width = '100%';
        chatPanel.style.position = 'absolute';
    }
});

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
        // En pantallas pequeñas, mostrar el panel de chat
        if (window.innerWidth <= 768) {
            chatsPanel.style.display = 'none';
            chatPanel.classList.add('active');
        }
        
        document.querySelectorAll('.chat-item').forEach(chat => {
            chat.classList.remove('active');
        });
        this.classList.add('active');

        const groupName = this.querySelector('.chat-name').textContent;
        document.querySelector('.chat-header .chat-name').textContent = groupName;
        document.querySelector('.chat-header .user-avatar').innerHTML = '<i class="fas fa-users"></i>';

        // Cambiar la conversación al grupo seleccionado
        updateGroupConversation(this.getAttribute('data-chat'));
    });
});

// Añadir event listeners para las llamadas (para redial)
document.querySelectorAll('#callsList .call-item').forEach(item => {
    item.addEventListener('click', function () {
        const contactName = this.querySelector('.call-name').textContent;
        const contactAvatar = this.querySelector('.call-avatar').textContent;
        
        // Actualizar información del contacto
        document.querySelector('.chat-header .chat-name').textContent = contactName;
        document.querySelector('.chat-header .user-avatar').textContent = contactAvatar;

        // Mostrar modal de llamada
        voiceCallModal.style.display = 'flex';
    });
});

// Función para actualizar conversación de grupo
function updateGroupConversation(groupType) {
    const messagesContainer = document.querySelector('.messages-container');
    messagesContainer.innerHTML = '';

    if (groupType === 'grupo1') {
        messagesContainer.innerHTML = `
            <div class="message received">
                <div class="message-text">¡Hola a todos! ¿Listos para el Mundial?</div>
                <div class="message-time">10:30</div>
            </div>
            <div class="message sent">
                <div class="message-text">¡Claro! Ya tengo mis boletos</div>
                <div class="message-time">10:31</div>
            </div>
            <div class="message received">
                <div class="message-text">Yo también, nos vemos en el estadio</div>
                <div class="message-time">10:32</div>
            </div>
        `;
    } else if (groupType === 'grupo2') {
        messagesContainer.innerHTML = `
            <div class="message received">
                <div class="message-text">¿Qué opinan del nuevo formato?</div>
                <div class="message-time">09:15</div>
            </div>
            <div class="message sent">
                <div class="message-text">Me gusta, más equipos participan</div>
                <div class="message-time">09:16</div>
            </div>
        `;
    } else {
        messagesContainer.innerHTML = `
            <div class="message received">
                <div class="message-text">Bienvenidos al grupo</div>
                <div class="message-time">12:00</div>
            </div>
            <div class="message sent">
                <div class="message-text">¡Gracias por la invitación!</div>
                <div class="message-time">12:01</div>
            </div>
        `;
    }

    // Hacer scroll al final de los mensajes
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
function renderMessage(text, type) {
    const currentTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);
    messageDiv.innerHTML = `
        <div class="message-text">${text}</div>
        <div class="message-time">${currentTime}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
const searchBox = document.querySelector('.search-box');
let usuarios = [];

// Traer usuarios al cargar la página
async function loadUsers() {
    try {
        const resp = await fetch('php/get_users.php');
        const data = await resp.json();
        if (data.success) {
            usuarios = data.usuarios;
        }
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
    }
}

// Función para filtrar usuarios según lo que escriba el usuario
searchBox.addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const filtered = usuarios.filter(u => u.nombre.toLowerCase().includes(query));

    // Mostrar resultados en la lista de chats (temporalmente)
    conversationsList.innerHTML = '';
    filtered.forEach(user => {
        const div = document.createElement('div');
        div.classList.add('chat-item');
        div.setAttribute('data-chat', user.id_usuario);
      div.innerHTML = `
  <div class="chat-avatar">
    ${
      user.foto_perfil
        ? `<img src="${user.foto_perfil}" alt="${user.nombre}" class="avatar-img">`
        : user.nombre[0]
    }
  </div>
  <div class="chat-info">
    <div class="chat-name">${user.nombre}</div>
    <div class="chat-preview">Iniciar chat</div>
  </div>
  <div class="chat-time">Ahora</div>
`;
        // Click para abrir chat
        div.addEventListener('click', () => {
            startChatWith(user.id_usuario, user.nombre);
        });

        conversationsList.appendChild(div);
    });
});

// Función para abrir el chat con un usuario
function startChatWith(userId, userName) {
    currentChatId = null; // si todavía no existe un chat, se creará al enviar mensaje
    document.querySelector('.chat-header .chat-name').textContent = userName;
    document.querySelector('.chat-header .user-avatar').textContent = userName[0];
    messagesContainer.innerHTML = '<p>Comienza la conversación...</p>';
}

loadUsers();
async function loadChatMessages(id_chat) {
  messagesContainer.innerHTML = "<p>Cargando mensajes...</p>";

  try {
    const resp = await fetch(`php/get_messages.php?id_chat=${id_chat}`);
    const data = await resp.json();

    messagesContainer.innerHTML = "";

    if (data.success && Array.isArray(data.messages)) {
      data.messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', msg.id_usuario == currentUserId ? 'sent' : 'received');
        messageDiv.innerHTML = `
          <div class="message-text">${msg.contenido}</div>
          <div class="message-time">${new Date(msg.fecha_envio).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
        `;
        messagesContainer.appendChild(messageDiv);
      });
    } else {
      messagesContainer.innerHTML = "<p>No hay mensajes todavía.</p>";
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } catch (error) {
    console.error("Error cargando mensajes:", error);
  }
}