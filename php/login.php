<?php
session_start();
include("conexion.php"); 

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $correo = $_POST["email"];
    $password = $_POST["password"];
    $recordar = isset($_POST["recordar"]);

  
    $stmt = $conn->prepare("CALL sp_obtener_usuario(?)");
$stmt->bind_param("s", $correo);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
   
    $idUsuario = $row["id_usuario"];
    $hash = $row["contraseña"];


    $result->free();
    $stmt->close();
    $conn->next_result(); 

    
    if (password_verify($password, $hash)) {
        // Actualizar estado a en_linea
        $update = $conn->prepare("UPDATE Usuario SET estado_conexion = 'en_linea' WHERE id_usuario = ?");
        $update->bind_param("i", $idUsuario);
        $update->execute();
        $update->close();

        //  Guardar sesión
        $_SESSION["id_usuario"] = $idUsuario;
        $_SESSION["nombre"] = $row["nombre"];
        $_SESSION["correo"] = $row["correo"];
        $_SESSION["estado_conexion"] = "en_linea";
        $_SESSION["es_admin"] = $row["es_admin"];

   
        if ($recordar) {
            setcookie("correo", $correo, time() + (86400 * 30), "/");
            setcookie("password", $password, time() + (86400 * 30), "/");
        }

        header("Location: ../index.html");
        exit();
    } else {
        echo "<script>alert('Contraseña incorrecta');window.location.href='login.html';</script>";
    }
} else {
    echo "<script>alert('Usuario no encontrado');window.location.href='login.html';</script>";
}

    $stmt->close();
}
$conn->close();
?>