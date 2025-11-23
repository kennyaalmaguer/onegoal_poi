<?php
session_start();

$host = "127.0.0.1:3306";
$usuario = "root";
$clave = "";
$bd = "onegoal";

$conn = new mysqli($host, $usuario, $clave, $bd);
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $correo = $_POST["email"];
    $password = $_POST["password"];

    $sql = "SELECT id_usuario, nombre, correo, contraseña, foto_perfil FROM Usuario WHERE correo = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $correo);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        if (password_verify($password, $row['contraseña'])) {

            // Guardar sesión PHP
            $_SESSION['id_usuario'] = $row['id_usuario'];
            $_SESSION['nombre'] = $row['nombre'];
            $_SESSION['correo'] = $row['correo'];
            $_SESSION['foto_perfil'] = base64_encode($row['foto_perfil']);
            $_SESSION['estado_conexion'] = "en_linea";

            // Actualizar estado en BD
            $update = $conn->prepare("UPDATE Usuario SET estado_conexion = 'en_linea' WHERE id_usuario = ?");
            $update->bind_param("i", $row['id_usuario']);
            $update->execute();

            // ⚡️ EN ESTA PARTE AGREGAMOS EL REGISTRO DEL SOCKET
            echo "
            <script src='https://cdn.socket.io/4.7.2/socket.io.min.js'></script>
            <script>
                // Guardar en localStorage
                localStorage.setItem('idUsuarioActual', '{$row['id_usuario']}');
                localStorage.setItem('nombreUsuarioActual', '" . addslashes($row['nombre']) . "');
                localStorage.setItem('correoUsuarioActual', '" . addslashes($row['correo']) . "');
                localStorage.setItem('fotoUsuarioActual', '" . base64_encode($row['foto_perfil']) . "');
                localStorage.setItem('estadoConexion', 'en_linea');
                
                // Conectar al servidor de Socket.io y registrar usuario
                const socket = io('http://localhost:3000');
                
                // Esperar a que se conecte el socket
                socket.on('connect', () => {
                    console.log('✅ Conectado al servidor de videollamadas');
                    // Registrar el usuario en el sistema de videollamadas
                    socket.emit('register', '{$row['id_usuario']}');
                    
                    // Guardar el socket en una variable global para usar después
                    window.socketVideollamadas = socket;
                    
                    // Redirigir a la página principal
                    window.location.href = '../index.html';
                });
                
                // Si hay error de conexión, redirigir igualmente
                socket.on('connect_error', (error) => {
                    console.error('❌ Error conectando al servidor de videollamadas:', error);
                    window.location.href = '../index.html';
                });
                
            </script>
            ";
            exit();

        } else {
            header('Location: ../login.html?error=contraseña');
            exit();
        }
    } else {
        header('Location: ../login.html?error=usuario');
        exit();
    }

    $stmt->close();
}

$conn->close();
?>