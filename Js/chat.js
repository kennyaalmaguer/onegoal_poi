// chat.js - COMPLETO CON SISTEMA DE VIDEOCALLAS
let currentChatId = null;
let currentUserId = null;
let lastMessageCheck = 0;
let usuarios = [];
let userAvatarMap = {};
let cifradoActivo = false;
let idUsuarioDestino = null;

// Variables para llamadas
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let isCallActive = false;
let callStartTime = null;
let callTimer = null;

// Variables para Socket.io
let socket = null;
let currentCallPartner = null;
let isCaller = false;

// ✅ FUNCIÓN DE DEBUG PARA VER ESTADO DE CONEXIONES
function debugConexiones() {
    console.log('=== DEBUG CONEXIONES ===');
    console.log('Socket conectado:', socket?.connected);
    console.log('Usuario actual ID:', currentUserId);
    console.log('Usuario actual Nombre:', window.usuarioActualNombre);
    console.log('Chat seleccionado:', currentChatId);
    console.log('Usuario destino:', idUsuarioDestino);
    console.log('Socket ID:', socket?.id);
    
    // Verificar si el usuario está registrado en el servidor
    if (socket) {
        socket.emit('debug-users', {});
    }
}

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
    
    // ✅ CONFIGURAR SISTEMA DE LLAMADAS CON SOCKET.IO
    inicializarSistemaLlamadas();
    
    debugLog("Inicialización completada");
});

// ==================== SISTEMA DE LLAMADAS CON SOCKET.IO ====================

// ✅ INICIALIZAR SISTEMA DE LLAMADAS
function inicializarSistemaLlamadas() {
    // Cargar Socket.io desde CDN si no está cargado
    if (typeof io === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        script.onload = conectarSocket;
        document.head.appendChild(script);
    } else {
        conectarSocket();
    }
}

// ✅ CONECTAR SOCKET
function conectarSocket() {
    try {
        socket = io('http://localhost:3000');
        configurarEventosSocket();
        
        // Registrar usuario si ya está logueado
        const usuarioId = localStorage.getItem('idUsuarioActual');
        const usuarioNombre = localStorage.getItem('nombreUsuarioActual');
        
        if (usuarioId) {
            registrarUsuarioSocket(usuarioId, usuarioNombre);
        }
        
    } catch (error) {
        console.error('❌ Error conectando al servidor de llamadas:', error);
    }
}

// ✅ REGISTRAR USUARIO EN SOCKET
function registrarUsuarioSocket(userId, userName) {
    currentUserId = userId;
    
    if (socket) {
        socket.emit('register', userId);
        console.log(`👤 Usuario registrado en sistema de llamadas: ${userId} - ${userName}`);
        
        // Guardar en variables globales para acceso rápido
        window.usuarioActualId = userId;
        window.usuarioActualNombre = userName;
    }
}

// ✅ CONFIGURAR EVENTOS DEL SOCKET
function configurarEventosSocket() {
    if (!socket) return;

    socket.on('connect', () => {
        console.log('✅ Conectado al servidor de videollamadas');
        
        // Re-registrar usuario si está logueado
        const usuarioId = localStorage.getItem('idUsuarioActual');
        if (usuarioId) {
            socket.emit('register', usuarioId);
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ Desconectado del servidor de videollamadas');
    });

    // 📞 LLAMADA ENTRANTE
    socket.on('video-call-offer', (data) => {
        console.log('📞 Llamada entrante:', data.caller);
        mostrarLlamadaEntrante(data.caller);
    });

    // ✅ LLAMADA ACEPTADA
    socket.on('video-call-accepted', (data) => {
        console.log('✅ Llamada aceptada por:', data.receiver);
        ocultarModalLlamando();
        iniciarWebRTCComoCaller();
    });

    // ❌ LLAMADA RECHAZADA
    socket.on('video-call-rejected', () => {
        console.log('❌ Llamada rechazada');
        ocultarModalLlamando();
        mostrarAlerta('El usuario no pudo atender la llamada', 'warning');
    });

    // 📞 LLAMADA CANCELADA
    socket.on('video-call-cancelled', () => {
        console.log('📞 Llamada cancelada por el remitente');
        ocultarModalLlamadaEntrante();
        mostrarAlerta('Llamada cancelada', 'info');
    });

    // 📞 LLAMADA FINALIZADA
    socket.on('call-ended', () => {
        console.log('📞 Llamada finalizada por el otro usuario');
        finalizarLlamadaCompleta();
        mostrarAlerta('Llamada finalizada', 'info');
    });

    // ❌ USUARIO NO DISPONIBLE
    socket.on('call-user-unavailable', () => {
        ocultarModalLlamando();
        mostrarAlerta('El usuario no está disponible', 'warning');
    });

    // 📡 SEÑALES WEBRTC
    socket.on('webrtc-signal', (data) => {
        console.log('📡 Señal WebRTC recibida:', data.signal);
        manejarSenalWebRTC(data.signal);
    });
}

// ==================== FUNCIONES PRINCIPALES DE LLAMADAS ====================

// ✅ INICIAR VIDEOLLAMADA
function iniciarVideoLlamada() {
    if (!validarChatSeleccionado()) return;
    
    const activeChat = document.querySelector('.chat-item.active');
    if (!activeChat) {
        mostrarAlerta('Selecciona un contacto primero', 'warning');
        return;
    }
    
    const usuarioId = activeChat.dataset.chat;
    const usuarioNombre = activeChat.querySelector('.chat-name')?.textContent || 'Contacto';
    
    iniciarVideollamada(usuarioId, usuarioNombre);
}

// ✅ INICIAR LLAMADA DE VOZ (CORREGIDA)
function iniciarLlamadaVoz() {
    if (!validarChatSeleccionado()) return;
    
    const activeChat = document.querySelector('.chat-item.active');
    if (!activeChat) {
        mostrarAlerta('Selecciona un contacto primero', 'warning');
        return;
    }
    
    const usuarioId = activeChat.dataset.chat;
    const usuarioNombre = activeChat.querySelector('.chat-name')?.textContent || 'Contacto';
    
    // LLAMADA DE VOZ REAL - no el mensaje de "en desarrollo"
    iniciarLlamadaVozReal(usuarioId, usuarioNombre);
}

/*// ✅ FUNCIÓN REAL PARA LLAMADA DE VOZ
function iniciarLlamadaVozReal(usuarioId, usuarioNombre) {
    if (!validarUsuarioRegistrado()) return;
    
    currentCallPartner = usuarioId;
    isCaller = true;
    
    if (!socket || !socket.connected) {
        mostrarAlerta('Error de conexión con el servidor de llamadas', 'error');
        return;
    }
    
    socket.emit('video-call-offer', {
        caller: { 
            id: currentUserId, 
            nombre: window.usuarioActualNombre || 'Usuario' 
        },
        receiver: { 
            id: usuarioId, 
            nombre: usuarioNombre 
        },
        tipo_llamada: 'voz'  // ⬅️ IMPORTANTE: Indicar que es llamada de voz
    });
    
    mostrarModalLlamando(usuarioNombre);
}*/

// ✅ SISTEMA MEJORADO DE LLAMADAS
function iniciarVideoLlamada() {
    if (!validarChatSeleccionado()) return;
    
    const activeChat = document.querySelector('.chat-item.active');
    if (!activeChat) {
        mostrarAlerta('Selecciona un contacto primero', 'warning');
        return;
    }
    
    const usuarioId = activeChat.dataset.chat;
    const usuarioNombre = activeChat.querySelector('.chat-name')?.textContent || 'Contacto';
    
    console.log('Iniciando videollamada con:', usuarioId, usuarioNombre);
    iniciarVideollamada(usuarioId, usuarioNombre);
}

function iniciarLlamadaVoz() {
    if (!validarChatSeleccionado()) return;
    
    const activeChat = document.querySelector('.chat-item.active');
    if (!activeChat) {
        mostrarAlerta('Selecciona un contacto primero', 'warning');
        return;
    }
    
    const usuarioId = activeChat.dataset.chat;
    const usuarioNombre = activeChat.querySelector('.chat-name')?.textContent || 'Contacto';
    
    console.log('Iniciando llamada de voz con:', usuarioId, usuarioNombre);
    iniciarLlamadaVozReal(usuarioId, usuarioNombre);
}

// ✅ FUNCIÓN MEJORADA PARA INICIAR VIDEOLLAMADA
function iniciarVideollamada(usuarioId, usuarioNombre) {
    if (!validarUsuarioRegistrado()) return;
    
    currentCallPartner = usuarioId;
    isCaller = true;
    
    if (!socket || !socket.connected) {
        mostrarAlerta('Error de conexión con el servidor de llamadas', 'error');
        return;
    }
    
    console.log('📞 Enviando oferta de videollamada a:', usuarioId);
    
    socket.emit('video-call-offer', {
        caller: { 
            id: currentUserId, 
            nombre: window.usuarioActualNombre || 'Usuario' 
        },
        receiver: { 
            id: usuarioId, 
            nombre: usuarioNombre 
        },
        tipo_llamada: 'video'
    });
    
    mostrarModalLlamando(usuarioNombre);
}

// ✅ FUNCIÓN MEJORADA PARA INICIAR LLAMADA DE VOZ
function iniciarLlamadaVozReal(usuarioId, usuarioNombre) {
    if (!validarUsuarioRegistrado()) return;
    
    currentCallPartner = usuarioId;
    isCaller = true;
    
    if (!socket || !socket.connected) {
        mostrarAlerta('Error de conexión con el servidor de llamadas', 'error');
        return;
    }
    
    console.log('📞 Enviando oferta de llamada de voz a:', usuarioId);
    
    socket.emit('video-call-offer', {
        caller: { 
            id: currentUserId, 
            nombre: window.usuarioActualNombre || 'Usuario' 
        },
        receiver: { 
            id: usuarioId, 
            nombre: usuarioNombre 
        },
        tipo_llamada: 'voz'
    });
    
    mostrarModalLlamando(usuarioNombre);
}

// ✅ ACEPTAR LLAMADA ENTRANTE
function aceptarLlamada() {
    if (!window.callerData) {
        console.error('No hay datos del llamante');
        return;
    }
    
    currentCallPartner = window.callerData.id;
    isCaller = false;
    
    socket.emit('video-call-accept', {
        callerId: window.callerData.id,
        receiver: { 
            id: currentUserId, 
            nombre: window.usuarioActualNombre || 'Usuario' 
        }
    });
    
    ocultarModalLlamadaEntrante();
    iniciarWebRTCComoReceptor();
}

// ✅ RECHAZAR LLAMADA ENTRANTE
function rechazarLlamada() {
    if (!window.callerData) return;
    
    socket.emit('video-call-reject', { callerId: window.callerData.id });
    ocultarModalLlamadaEntrante();
    currentCallPartner = null;
    window.callerData = null;
}

// ✅ CANCELAR LLAMADA SALIENTE
function cancelarLlamada() {
    if (currentCallPartner) {
        socket.emit('video-call-cancel', { receiverId: currentCallPartner });
        currentCallPartner = null;
    }
    ocultarModalLlamando();
}

// ✅ COLGAR LLAMADA EN CURSO
function colgarLlamada() {
    if (currentCallPartner) {
        socket.emit('end-call', { partnerId: currentCallPartner });
    }
    finalizarLlamadaCompleta();
}

// ✅ FINALIZAR LLAMADA COMPLETA
function finalizarLlamadaCompleta() {
    // Ocultar todos los modales
    ocultarModalLlamando();
    ocultarModalLlamadaEntrante();
    
    const voiceModal = document.getElementById('voiceCallModal');
    const videoModal = document.getElementById('videoCallModal');
    
    if (voiceModal) voiceModal.style.display = 'none';
    if (videoModal) videoModal.style.display = 'none';
    
    // Limpiar recursos
    limpiarRecursosMedia();
    detenerTemporizadorLlamada();
    
    // Resetear estado
    isCallActive = false;
    currentCallPartner = null;
    isCaller = false;
    window.callerData = null;
    
    // Guardar duración si había llamada en curso
    if (callStartTime) {
        const duracion = calcularDuracionLlamada();
        actualizarDuracionLlamada(duracion);
    }
}

// ==================== WEBRTC ====================

// ✅ INICIAR WEBRTC COMO LLAMANTE
async function iniciarWebRTCComoCaller() {
    try {
        await obtenerStreamMedia(true); // Con video
        mostrarModalLlamadaEnCurso();
        configurarPeerConnection();
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        socket.emit('webrtc-signal', {
            partnerId: currentCallPartner,
            signal: peerConnection.localDescription
        });
        
    } catch (error) {
        console.error('❌ Error iniciando WebRTC:', error);
        mostrarAlerta('Error al acceder a la cámara/micrófono', 'error');
        finalizarLlamadaCompleta();
    }
}

// ✅ INICIAR WEBRTC COMO RECEPTOR
async function iniciarWebRTCComoReceptor() {
    try {
        await obtenerStreamMedia(true); // Con video
        mostrarModalLlamadaEnCurso();
        configurarPeerConnection();
        
    } catch (error) {
        console.error('❌ Error iniciando WebRTC:', error);
        mostrarAlerta('Error al acceder a la cámara/micrófono', 'error');
        finalizarLlamadaCompleta();
    }
}

// ✅ OBTENER STREAM DE MEDIOS
async function obtenerStreamMedia(conVideo = false) {
    try {
        const constraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: conVideo ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            } : false
        };
        
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Mostrar video local
        const localVideo = document.getElementById('localVideo');
        if (localVideo && conVideo) {
            localVideo.srcObject = localStream;
            localVideo.play().catch(e => console.error('Error reproduciendo video local:', e));
        }
        
        // Ocultar placeholder si existe
        const localPlaceholder = document.getElementById('localPlaceholder');
        if (localPlaceholder) localPlaceholder.style.display = 'none';
        
    } catch (error) {
        console.error('❌ Error accediendo a medios:', error);
        throw error;
    }
}

// ✅ CONFIGURAR PEER CONNECTION
function configurarPeerConnection() {
    peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    });
    
    // Agregar stream local
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
    
    // Manejar stream remoto
    peerConnection.ontrack = (event) => {
        console.log('🎥 Stream remoto recibido');
        remoteStream = event.streams[0];
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
            remoteVideo.srcObject = remoteStream;
            remoteVideo.play().catch(e => console.error('Error reproduciendo video remoto:', e));
        }
        
        // Ocultar placeholder remoto si existe
        const remotePlaceholder = document.getElementById('remotePlaceholder');
        if (remotePlaceholder) remotePlaceholder.style.display = 'none';
    };
    
    // Manejar candidatos ICE
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('webrtc-signal', {
                partnerId: currentCallPartner,
                signal: { 
                    type: 'candidate', 
                    candidate: event.candidate 
                }
            });
        }
    };
    
    // Manejar cambios de estado
    peerConnection.onconnectionstatechange = () => {
        console.log(`Estado conexión WebRTC: ${peerConnection.connectionState}`);
        
        if (peerConnection.connectionState === 'connected') {
            console.log('✅ Conexión WebRTC establecida');
            iniciarTemporizadorLlamada();
        } else if (peerConnection.connectionState === 'failed') {
            console.error('❌ Conexión WebRTC fallida');
            mostrarAlerta('Error en la conexión de video', 'error');
            finalizarLlamadaCompleta();
        }
    };
}

// ✅ MANEJAR SEÑALES WEBRTC
async function manejarSenalWebRTC(signal) {
    if (!peerConnection) return;
    
    try {
        if (signal.type === 'offer') {
            await peerConnection.setRemoteDescription(signal);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            socket.emit('webrtc-signal', {
                partnerId: currentCallPartner,
                signal: answer
            });
            
        } else if (signal.type === 'answer') {
            await peerConnection.setRemoteDescription(signal);
            
        } else if (signal.type === 'candidate') {
            await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
    } catch (error) {
        console.error('❌ Error manejando señal WebRTC:', error);
    }
}

// ==================== INTERFAZ DE USUARIO - MODALES ====================

// ✅ MOSTRAR MODAL LLAMANDO
function mostrarModalLlamando(nombreUsuario) {
    const modal = document.getElementById('modalLlamando');
    const texto = document.getElementById('llamandoAUsuario');
    
    if (texto) texto.textContent = `Llamando a ${nombreUsuario}...`;
    if (modal) modal.style.display = 'flex';
}

// ✅ MOSTRAR LLAMADA ENTRANTE
function mostrarLlamadaEntrante(callerData) {
    const modal = document.getElementById('incomingCallModal');
    const texto = document.getElementById('infoLlamadaEntrante');
    const callerAvatar = document.getElementById('incomingCallerAvatar');
    const callerName = document.querySelector('#incomingCallModal h2');
    
    // Guardar datos del caller para usar después
    window.callerData = callerData;
    
    if (texto) texto.textContent = `${callerData.nombre} te está llamando`;
    if (callerName) callerName.textContent = callerData.nombre;
    if (callerAvatar) callerAvatar.textContent = callerData.nombre.charAt(0).toUpperCase();
    
    if (modal) modal.style.display = 'flex';
    
    // Auto-rechazar después de 30 segundos
    setTimeout(() => {
        if (modal && modal.style.display === 'flex') {
            rechazarLlamada();
        }
    }, 30000);
}

// ✅ MOSTRAR MODAL LLAMADA EN CURSO
function mostrarModalLlamadaEnCurso() {
    const modal = document.getElementById('videoCallModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Actualizar información del contacto
        const activeChat = document.querySelector('.chat-item.active');
        if (activeChat) {
            const nombre = activeChat.querySelector('.chat-name')?.textContent || 'Contacto';
            const nameElement = modal.querySelector('h2');
            if (nameElement) {
                nameElement.textContent = nombre;
            }
        }
        
        isCallActive = true;
    }
}

// ✅ OCULTAR MODALES
function ocultarModalLlamando() {
    const modal = document.getElementById('modalLlamando');
    if (modal) modal.style.display = 'none';
}

function ocultarModalLlamadaEntrante() {
    const modal = document.getElementById('incomingCallModal');
    if (modal) modal.style.display = 'none';
}

// ==================== UTILIDADES LLAMADAS ====================

// ✅ VALIDAR USUARIO REGISTRADO
function validarUsuarioRegistrado() {
    const usuarioId = localStorage.getItem('idUsuarioActual');
    if (!usuarioId) {
        mostrarAlerta('Debes iniciar sesión para realizar llamadas', 'warning');
        return false;
    }
    
    if (!socket || !socket.connected) {
        mostrarAlerta('Servidor de llamadas no disponible', 'error');
        return false;
    }
    
    return true;
}

// ✅ VALIDAR CHAT SELECCIONADO
function validarChatSeleccionado() {
    if (!currentChatId || !idUsuarioDestino) {
        mostrarAlerta('Selecciona un chat primero', 'warning');
        return false;
    }
    return true;
}

// ✅ LIMPIAR RECURSOS DE MEDIOS
function limpiarRecursosMedia() {
    // Detener streams locales
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Detener streams remotos
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }
    
    // Limpiar elementos de video
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    
    if (localVideo) {
        localVideo.srcObject = null;
    }
    if (remoteVideo) {
        remoteVideo.srcObject = null;
    }
    
    // Mostrar placeholders nuevamente
    const localPlaceholder = document.getElementById('localPlaceholder');
    const remotePlaceholder = document.getElementById('remotePlaceholder');
    
    if (localPlaceholder) localPlaceholder.style.display = 'flex';
    if (remotePlaceholder) remotePlaceholder.style.display = 'flex';
    
    // Cerrar conexión Peer
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
}

// ==================== TEMPORIZADOR LLAMADA ====================

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
    const videoStatus = document.getElementById('videoCallStatus');
    if (videoStatus) videoStatus.textContent = duracion;
}

// ==================== FUNCIONES DE ALERTA ====================

// ✅ MOSTRAR ALERTA
function mostrarAlerta(mensaje, tipo = 'info') {
    // Usar SweetAlert2 si está disponible, sino alert normal
    if (window.Swal) {
        Swal.fire({
            icon: tipo,
            title: mensaje,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    } else {
        alert(mensaje);
    }
}

// ==================== FUNCIONES ORIGINALES DEL CHAT (MANTENIDAS) ====================

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

// ==================== FUNCIONES GLOBALES PARA HTML ====================

// Hacer funciones disponibles globalmente para botones HTML
window.iniciarVideoLlamada = iniciarVideoLlamada;
window.iniciarLlamadaVoz = iniciarLlamadaVoz;
window.aceptarLlamada = aceptarLlamada;
window.rechazarLlamada = rechazarLlamada;
window.colgarLlamada = colgarLlamada;
window.cancelarLlamada = cancelarLlamada;

// Función para toggle de audio/video durante llamada
window.toggleAudio = function() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            console.log('Audio:', audioTrack.enabled ? 'Activado' : 'Desactivado');
        }
    }
};

window.toggleVideo = function() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            console.log('Video:', videoTrack.enabled ? 'Activado' : 'Desactivado');
        }
    }
};

// ✅ CONFIGURAR EVENT LISTENERS PARA BOTONES DE LLAMADA (versión mejorada)
function configurarBotonesLlamadas() {
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

// Llamar a la configuración de botones después de que el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(configurarBotonesLlamadas, 1000);
});