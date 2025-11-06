let isRecording = false;
let mediaRecorder;
let audioChunks = [];
//   CONFIGURACIÓN DE VARIABLES
let idUsuarioActual = localStorage.getItem('idUsuarioActual');
let idUsuarioDestino = null;
let localStream = null;
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

async function sendAudioMessage(audioBlob) {
    // Crea un archivo temporal en memoria
    const audioFile = new File([audioBlob], `audio_${Date.now()}.wav`, { type: 'audio/wav' });

    const formData = new FormData();
    formData.append("id_chat", currentChatId);
    formData.append("id_usuario", currentUserId);
    formData.append("archivo", audioFile);
    formData.append("tipo", "audio");
    formData.append("cifrado", cifradoActivo ? 1 : 0);

    try {
        const resp = await fetch("php/send_message.php", {
            method: "POST",
            body: formData
        });

        const result = await resp.json();
        console.log("Respuesta del servidor:", result);

        if (result.success) {
            // Renderiza el audio recién enviado
            renderMessage(result.url || result.contenido, "audio");
        } else {
            alert(" Error al enviar audio: " + (result.error || "Desconocido"));
        }
    } catch (error) {
        console.error("Error al enviar audio:", error);
    }
}


//   FUNCIONALIDAD DE LLAMADAS
const voiceCallBtn = document.getElementById('voiceCallBtn');
const videoCallBtn = document.getElementById('videoCallBtn');
const voiceCallModal = document.getElementById('voiceCallModal');
const videoCallModal = document.getElementById('videoCallModal');
const incomingCallModal = document.getElementById('incomingCallModal');

// ===========================================
// FUNCIONES AUXILIARES
// ===========================================
function obtenerChatSeleccionado() {
    if (!currentChatId) {
        console.warn("No hay currentChatId definido.");
        return null;
    }

    let chatSeleccionado = null;
    const chatIdString = String(currentChatId);

    // Buscar en grupos (asegura coincidencia de tipo)
    if (Array.isArray(window.grupos) && grupos.length > 0) {
        const grupo = grupos.find(g => String(g.id_grupo) === chatIdString);
        if (grupo) {
            chatSeleccionado = { tipo: "grupo", id_grupo: grupo.id_grupo, nombre: grupo.nombre };
        }
    }

    // Si no es grupo, buscar en privados
    if (!chatSeleccionado && Array.isArray(window.chatsPrivados)) {
        const chat = chatsPrivados.find(c => String(c.id_chat) === chatIdString);
        if (chat) {
            chatSeleccionado = { tipo: "privado", id_chat: chat.id_chat };
        }
    }

    // Último recurso: usar currentChatId como privado
    if (!chatSeleccionado) {
        chatSeleccionado = { tipo: "privado", id_chat: currentChatId };
    }

    console.log("Chat seleccionado:", chatSeleccionado);
    return chatSeleccionado;
}



//  INICIAR LLAMADA DE VOZ

voiceCallBtn.addEventListener('click', () => {
    if (!currentChatId) {
        alert("Selecciona un chat válido antes de iniciar una llamada.");
        return;
    }

    const chatSeleccionado = obtenerChatSeleccionado();
    const esGrupo = chatSeleccionado && chatSeleccionado.tipo === "grupo";

    if (esGrupo) {
        nombre = chatSeleccionado.nombre || "Grupo";
        avatarInicial = "G";
        destino = null; // no hay idUsuarioDestino
    } else {
        const usuarioDestino = usuarios.find(u => u.id_usuario == idUsuarioDestino);
        if (!usuarioDestino) {
            alert("Selecciona un usuario válido para llamar.");
            return;
        }
        nombre = usuarioDestino.nombre;
        avatarInicial = nombre.charAt(0).toUpperCase();
        destino = idUsuarioDestino;
    }
    actualizarDatosModalLlamada(nombre, avatarInicial, destino);
    voiceCallModal.style.display = 'flex';

registrarLlamada(chatSeleccionado, idUsuarioActual, destino, 'voz', 'saliente');
});

// ===========================================
// INICIAR VIDEOLLAMADA
// ===========================================
videoCallBtn.addEventListener('click', async () => {
    if (!currentChatId) {
        alert("Selecciona un chat válido antes de iniciar una videollamada.");
        return;
    }

    const chatSeleccionado = obtenerChatSeleccionado();
    const esGrupo = chatSeleccionado && chatSeleccionado.tipo === "grupo";

    if (esGrupo) {
        nombre = chatSeleccionado.nombre || "Grupo";
        avatarInicial = "G";
        destino = null; // no hay idUsuarioDestino
    } else {
        const usuarioDestino = usuarios.find(u => u.id_usuario == idUsuarioDestino);
        if (!usuarioDestino) {
            alert("Selecciona un usuario válido para llamar.");
            return;
        }
        nombre = usuarioDestino.nombre;
        avatarInicial = nombre.charAt(0).toUpperCase();
        destino = idUsuarioDestino;
    }
    actualizarDatosModalLlamada(nombre, avatarInicial, destino);
    videoCallModal.style.display = 'flex';

    await startVideoCall();

  registrarLlamada(chatSeleccionado, idUsuarioActual, destino, 'video', 'saliente');
});

function mostrarLlamadaEntrante(nombreEmisor) {
    const avatarLetra = nombreEmisor.charAt(0).toUpperCase();
    actualizarDatosModalLlamada(nombreEmisor, avatarLetra, 'entrante', 'Llamada entrante...');
    incomingCallModal.style.display = 'flex';
}
//  FUNCIONES DE VIDEO Y AUDIO

async function startVideoCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true
        });

        const localVideo = document.getElementById('localVideo');
        const localPlaceholder = document.getElementById('localPlaceholder');
        localVideo.srcObject = localStream;
        localVideo.style.display = 'block';
        localPlaceholder.style.display = 'none';
        simulateRemoteVideo();
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        alert('No se pudo acceder a la cámara.');
    }
}

function simulateRemoteVideo() {
    const remoteVideo = document.getElementById('remoteVideo');
    const remotePlaceholder = document.getElementById('remotePlaceholder');
    remoteVideo.style.display = 'none';
    remotePlaceholder.style.display = 'flex';
}

function stopVideoCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    document.getElementById('localVideo').style.display = 'none';
    document.getElementById('localPlaceholder').style.display = 'flex';
    document.getElementById('remoteVideo').style.display = 'none';
    document.getElementById('remotePlaceholder').style.display = 'flex';
}


// Colgar llamada de voz
document.getElementById('hangupVoiceCall').addEventListener('click', () => {
    voiceCallModal.style.display = 'none';
    registrarLlamada(currentChatId, idUsuarioActual, idUsuarioDestino, 'voz', 'perdida');
});

document.getElementById('hangupVideoCall').addEventListener('click', () => {
    stopVideoCall();
    videoCallModal.style.display = 'none';
    registrarLlamada(currentChatId, idUsuarioActual, idUsuarioDestino, 'video', 'perdida');
});


// Simular llamada entrante después de 5 segundos (para demostración)
/*setTimeout(() => {
    const nombre = "Cristiano Ronaldo"; // Esto lo traerías dinámicamente
    const avatarInicial = nombre.charAt(0);

    actualizarDatosModalLlamada(nombre, avatarInicial);
    incomingCallModal.style.display = 'flex';
}, 5000);*/


// Aceptar llamada entrante
document.getElementById('acceptCall').addEventListener('click', () => {
    incomingCallModal.style.display = 'none';
    voiceCallModal.style.display = 'flex';
    registrarLlamada(currentChatId, idUsuarioActual, idUsuarioDestino, 'voz', 'entrante');

});

document.getElementById('declineCall').addEventListener('click', () => {
    incomingCallModal.style.display = 'none';
    registrarLlamada(currentChatId, idUsuarioActual, idUsuarioDestino, 'voz', 'perdida');
})


// Control de mute en llamada de voz
document.getElementById('muteBtn').addEventListener('click', function () {
    this.classList.toggle('active');
    const icon = this.querySelector('i');
    if (this.classList.contains('active')) {
        icon.className = 'fas fa-microphone-slash';
    } else {
        icon.className = 'fas fa-microphone';
    }
});

// Control de speaker en llamada de voz
document.getElementById('speakerBtn').addEventListener('click', function () {
    this.classList.toggle('active');
});

// Control de video en videollamada
document.getElementById('videoMuteBtn').addEventListener('click', function () {
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
document.getElementById('videoAudioMuteBtn').addEventListener('click', function () {
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
document.getElementById('videoSpeakerBtn').addEventListener('click', function () {
    this.classList.toggle('active');
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
window.addEventListener('resize', function () {
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


// =========================
//  Registrar llamada
// =========================
async function registrarLlamada(chatSeleccionado, idUsuarioEmisor, idUsuarioReceptor, tipoLlamada, estado) {
    let idChat = null;
    let idGrupo = null;

    // Detectar tipo de chat correctamente
    if (chatSeleccionado && typeof chatSeleccionado === "object") {
        if (chatSeleccionado.tipo === "grupo") {
            idGrupo = parseInt(chatSeleccionado.id_grupo);
        } else {
            idChat = parseInt(chatSeleccionado.id_chat || currentChatId);
        }
    } else {
        // Fallback por si algo sale raro
        const grupoExiste = Array.isArray(window.grupos) && window.grupos.some(g => String(g.id_grupo) === String(currentChatId));
        if (grupoExiste) {
            idGrupo = parseInt(currentChatId);
        } else {
            idChat = parseInt(currentChatId);
        }
    }

    console.log("📞 Registrando llamada:", {
        idChat,
        idGrupo,
        idUsuarioEmisor,
        idUsuarioReceptor,
        tipoLlamada,
        estado
    });

    try {
        const response = await fetch("http://localhost:8080/onegoal_poi/api/api_llamadas.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                idChat,
                idGrupo,
                idUsuarioEmisor,
                idUsuarioReceptor: idUsuarioReceptor || null,
                tipo: tipoLlamada,
                estado
            }),
        });

        const data = await response.json();
        console.log("✅ Llamada registrada:", data);
    } catch (error) {
        console.error("❌ Error al registrar llamada:", error);
    }
}


function actualizarDatosModalLlamada(nombre, avatarInicial, idUsuario = null) {
    // Si tenemos ID, buscamos su avatar en el mapa
    let avatarHTML = avatarInicial;
    if (idUsuario && userAvatarMap[idUsuario]) {
        avatarHTML = userAvatarMap[idUsuario];
    } else {
        avatarHTML = `<div class="avatar-placeholder">${avatarInicial}</div>`;
    }

    // ---- Modal de llamada de voz ----
    const voiceAvatar = voiceCallModal.querySelector('.caller-avatar');
    const voiceName = voiceCallModal.querySelector('h2');
    if (voiceAvatar && voiceName) {
        voiceAvatar.innerHTML = avatarHTML;
        voiceName.textContent = nombre;
    }

    // ---- Modal de videollamada ----
    const videoAvatar = videoCallModal.querySelector('#remotePlaceholder .caller-avatar');
    const videoName = videoCallModal.querySelector('#remotePlaceholder p');
    if (videoAvatar && videoName) {
        videoAvatar.innerHTML = avatarHTML;
        videoName.textContent = nombre;
    }

    // ---- Modal de llamada entrante ----
    const incomingAvatar = incomingCallModal.querySelector('.caller-avatar');
    const incomingName = incomingCallModal.querySelector('h2');
    if (incomingAvatar && incomingName) {
        incomingAvatar.innerHTML = avatarHTML;
        incomingName.textContent = nombre;
    }
}
