<?php
session_start();

$host = "localhost";
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

            // ⚡️ En lugar de header(), imprimimos JS para guardar datos en localStorage y redirigir
            echo "
            <script>
                localStorage.setItem('idUsuarioActual', '{$row['id_usuario']}');
                localStorage.setItem('nombreUsuarioActual', '".addslashes($row['nombre'])."');
                localStorage.setItem('correoUsuarioActual', '".addslashes($row['correo'])."');
                localStorage.setItem('fotoUsuarioActual', '".base64_encode($row['foto_perfil'])."');
                localStorage.setItem('estadoConexion', 'en_linea');
                window.location.href = '../index.html';
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
