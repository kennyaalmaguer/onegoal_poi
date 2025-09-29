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
    $_SESSION['id_usuario'] = $row['id_usuario'];
    $_SESSION['nombre'] = $row['nombre'];
    $_SESSION['correo'] = $row['correo'];
    $_SESSION['foto_perfil'] = base64_encode($row['foto_perfil']);
    $_SESSION['estado_conexion'] = "en_linea";

    // Actualizamos en BD
    $update = $conn->prepare("UPDATE Usuario SET estado_conexion = 'en_linea' WHERE id_usuario = ?");
    $update->bind_param("i", $row['id_usuario']);
    $update->execute();

    header("Location: ../index.html");
    exit();

        } else {
      header("Location: ../login.html?error=contraseña");
            exit();
        }
    } else {
    header("Location: ../login.html?error=usuario");
        exit();
    }

    $stmt->close();
}

$conn->close();
?>