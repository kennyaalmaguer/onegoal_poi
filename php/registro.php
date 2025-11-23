<?php
session_start();

// Configuración BD
$host = "127.0.0.1:3306";
$usuario = "root";     
$clave = "";           
$bd = "onegoal";

$conn = new mysqli($host, $usuario, $clave, $bd);
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $nombre = trim($_POST["nombre"]);
    $apellido = trim($_POST["apellido"]);
    $correo = trim($_POST["correo"]);
    $password = $_POST["password"];
    $confirm_password = $_POST["confirm_password"];
    $pais = $_POST["pais"];

    // Validar contraseñas
    if ($password !== $confirm_password) {
        die("Las contraseñas no coinciden. <a href='../register.html'>Volver</a>");
    }

    // Encriptar contraseña
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $nombreCompleto = $nombre . " " . $apellido;

    // --- Validar imagen ---
    $fotoPerfil = null;
    if (isset($_FILES['foto']) && $_FILES['foto']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['foto']['tmp_name'];
        $fileSize = $_FILES['foto']['size'];
        $fileType = mime_content_type($fileTmpPath);
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

        if (!in_array($fileType, $allowedTypes)) {
            die("Formato no permitido. Solo JPG, PNG o GIF.");
        }
        if ($fileSize > 2 * 1024 * 1024) {
            die("La imagen no debe superar los 2MB.");
        }

        // Guardamos contenido binario
        $fotoPerfil = file_get_contents($fileTmpPath);
    }

    // --- Registrar usuario con Procedure ---
    $sql = "CALL sp_registrar_usuario(?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);

    // Vinculamos parámetros: nombre, correo, pass, pais, foto
    $null = null; // para bindear el blob
 $stmt->bind_param("ssssb", $nombreCompleto, $correo, $passwordHash, $pais, $null);

   if ($fotoPerfil !== null) {
    $stmt->send_long_data(4, $fotoPerfil); // 4 = índice del último parámetro
}

    if ($stmt->execute()) {
        echo "✅ Usuario registrado correctamente. <a href='../login.html'>Inicia sesión</a>";
    } else {
        echo "❌ Error al registrar: " . $stmt->error;
    }

    $stmt->close();
}

$conn->close();
?>