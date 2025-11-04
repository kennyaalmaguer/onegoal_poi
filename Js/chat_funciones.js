let isRecording = false;
let mediaRecorder;
let audioChunks = [];
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


// --- Funcionalidad de llamadas ---
//const voiceCallBtn = document.getElementById('voiceCallBtn');
const videoCallBtn = document.getElementById('videoCallBtn');
//const voiceCallModal = document.getElementById('voiceCallModal');
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