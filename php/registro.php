<?php
// Configuración BD
$host = "localhost";
$usuario = "root";     // usuario XAMPP
$clave = "";           // contraseña vacía en XAMPP
$bd = "onegoal";

// Conexión
$conn = new mysqli($host, $usuario, $clave, $bd);
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// Verificar envío POST
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $nombre = trim($_POST["nombre"]);
    $apellido = trim($_POST["apellido"]);
    $correo = trim($_POST["correo"]);
    $password = $_POST["password"];
    $confirm_password = $_POST["confirm_password"];
    $pais = $_POST["pais"];

    // Validaciones básicas
    if ($password !== $confirm_password) {
        die("❌ Las contraseñas no coinciden. <a href='../registro.html'>Volver</a>");
    }

    // Encriptar contraseña
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    // Nombre completo
    $nombreCompleto = $nombre . " " . $apellido;

    // Llamar procedure
    $sql = "CALL sp_registrar_usuario(?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssss", $nombreCompleto, $correo, $passwordHash, $pais);

    if ($stmt->execute()) {
        echo "✅ Usuario registrado correctamente. <a href='../login.html'>Inicia sesión</a>";
    } else {
        echo "⚠️ Error: " . $stmt->error;
    }

    $stmt->close();
}

$conn->close();
?>