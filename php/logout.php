<?php
session_start();

$response = ["success" => false];

if (isset($_SESSION['id_usuario'])) {
    $id = $_SESSION['id_usuario'];

    $host = "127.0.0.1:3306";
    $usuario = "root";
    $clave = "";
    $bd = "onegoal";

    $conn = new mysqli($host, $usuario, $clave, $bd);
    if (!$conn->connect_error) {
        $update = $conn->prepare("UPDATE usuario SET estado_conexion = 'desconectado' WHERE id_usuario = ?");
        $update->bind_param("i", $id);
        $update->execute();
    }

    session_unset();
    session_destroy();

    $response["success"] = true;
}

header("Content-Type: application/json");
echo json_encode($response);
exit();
?>