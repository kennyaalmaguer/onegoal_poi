// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(express.json()); // Para poder leer JSON en el body
app.use(cors()); // Permitir peticiones de XAMPP

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permite cualquier origen
        methods: ["GET", "POST"]
    }
});

const PORT = 3000; // El puerto donde correrá este servidor Node.js

const userSockets = {};
// --- NUEVO: Mapeo para saber quién está en llamada con quién ---
const userInCall = {};

io.on('connection', (socket) => {
    console.log(`Un cliente se conectó: ${socket.id}`);

    // 1. Registro de usuario
    socket.on('register', (userId) => {
        console.log(`Usuario ${userId} registrado con socket ${socket.id}`);
        userSockets[userId] = socket.id;
        socket.userId = userId; // Guardamos el ID de usuario en el socket

        socket.on('disconnect', () => {
            console.log(`Usuario ${userId} (socket ${socket.id}) desconectado.`);
            if (userSockets[userId] === socket.id) {
                delete userSockets[userId];
            }
            // Si el usuario estaba en una llamada y se desconecta,
            // notificamos al otro usuario.
            const partnerId = userInCall[userId];
            if (partnerId) {
                const partnerSocketId = userSockets[partnerId];
                if (partnerSocketId) {
                    io.to(partnerSocketId).emit('call-ended');
                }
                delete userInCall[userId];
                delete userInCall[partnerId];
            }
        });
    });

    // --- INICIO: NUEVOS EVENTOS DE VIDEOLLAMADA ---

    // 2. Un usuario (caller) quiere iniciar una llamada
    socket.on('video-call-offer', (data) => {
        const { caller, receiver } = data;
        const receiverSocketId = userSockets[receiver.id];
        
        console.log(`Usuario ${caller.id} (${socket.id}) llamando a ${receiver.id} (${receiverSocketId})`);

        if (receiverSocketId) {
            // Reenviamos la oferta al destinatario
            io.to(receiverSocketId).emit('video-call-offer', { caller });
        } else {
            // El destinatario no está conectado
            socket.emit('call-user-unavailable');
        }
    });

    // 3. El destinatario (receiver) acepta la llamada
    socket.on('video-call-accept', (data) => {
        const { callerId, receiver } = data; // receiver es quien acepta
        const callerSocketId = userSockets[callerId];

        console.log(`Usuario ${receiver.id} aceptó la llamada de ${callerId}`);

        if (callerSocketId) {
            // Marcar a ambos usuarios como "en llamada"
            userInCall[callerId] = receiver.id;
            userInCall[receiver.id] = callerId;
            
            // Notificar al que llamó que aceptaron
            io.to(callerSocketId).emit('video-call-accepted', { receiver });
        }
    });

    // 4. El destinatario (receiver) rechaza la llamada
    socket.on('video-call-reject', (data) => {
        const { callerId } = data;
        const callerSocketId = userSockets[callerId];
        
        console.log(`Llamada rechazada para ${callerId}`);

        if (callerSocketId) {
            // Notificar al que llamó que rechazaron
            io.to(callerSocketId).emit('video-call-rejected');
        }
    });

    // 5. El que llama (caller) cancela la llamada
    socket.on('video-call-cancel', (data) => {
        const { receiverId } = data;
        const receiverSocketId = userSockets[receiverId];

        console.log(`Llamada cancelada para ${receiverId}`);

        if (receiverSocketId) {
            // Notificar al destinatario que cancele la pantalla "entrante"
            io.to(receiverSocketId).emit('video-call-cancelled');
        }
    });

    // 6. Cualquiera de los dos cuelga
    socket.on('end-call', (data) => {
        const { partnerId } = data;
        const partnerSocketId = userSockets[partnerId];

        console.log(`Usuario ${socket.userId} colgó la llamada con ${partnerId}`);

        if (partnerSocketId) {
            // Notificar al otro usuario que la llamada terminó
            io.to(partnerSocketId).emit('call-ended');
        }

        // Limpiar el estado de "en llamada"
        if (socket.userId) {
            delete userInCall[socket.userId];
        }
        delete userInCall[partnerId];
    });

    // 7. Señalización WebRTC (Ofertas, Respuestas, ICE Candidates)
    // Esto es un "pasamanos" de mensajes técnicos
    socket.on('webrtc-signal', (data) => {
        const { partnerId, signal } = data;
        const partnerSocketId = userSockets[partnerId];
        
        if (partnerSocketId) {
            // Reenviamos la señal al otro usuario
            io.to(partnerSocketId).emit('webrtc-signal', { signal });
        }
    });

    // --- FIN: NUEVOS EVENTOS DE VIDEOLLAMADA ---
});

// Endpoint para mensajes de chat (sin cambios)
app.post('/broadcast', (req, res) => {
    try {
        const { sender_id, receiver_id, message } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, m: 'No hay mensaje' });
        }
        
        const receiverSocketId = userSockets[receiver_id];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('newMessage', message);
        }

        const senderSocketId = userSockets[sender_id];
        if (senderSocketId) {
            io.to(senderSocketId).emit('newMessage', message);
        }

        res.json({ success: true });

    } catch (e) {
        console.error("Error en /broadcast:", e.message);
        res.status(500).json({ success: false });
    }
});

// Endpoint para estado "leído" (sin cambios)
app.post('/broadcast-read', (req, res) => {
    try {
        const { reader_id, original_sender_id } = req.body;

        if (!reader_id || !original_sender_id) {
            return res.status(400).json({ success: false, m: 'IDs faltantes' });
        }
        
        const originalSenderSocketId = userSockets[original_sender_id];
        
        if (originalSenderSocketId) {
            io.to(originalSenderSocketId).emit('messagesRead', { reader_id: reader_id });
        }

        res.json({ success: true });

    } catch (e) {
        console.error("Error en /broadcast-read:", e.message);
        res.status(500).json({ success: false });
    }
});

// ⚡️ CAMBIO IMPORTANTE: Escuchar en todas las interfaces
server.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================`);
    console.log(`🚀 Servidor Socket.io activo`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`🌐 Red: http://TU_IP_LOCAL:${PORT}`);
    console.log(`=================================`);
    
    // Obtener y mostrar IP local automáticamente
    obtenerIPsLocales().forEach(ip => {
        console.log(`📡 Acceso externo: http://${ip}:${PORT}`);
    });
});

// 🔧 FUNCIÓN PARA OBTENER IPS LOCALES
function obtenerIPsLocales() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const ips = [];
    
    Object.keys(interfaces).forEach(interfaceName => {
        interfaces[interfaceName].forEach(interface => {
            // IPv4 y no es interna
            if (interface.family === 'IPv4' && !interface.internal) {
                ips.push(interface.address);
            }
        });
    });
    
    return ips;
}