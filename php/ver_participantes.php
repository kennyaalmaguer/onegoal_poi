<?php
session_start();
include "conexion.php";
header("Content-Type: application/json; charset=utf-8");
if (!isset($_SESSION['id_usuario'])) {
    echo json_encode(["status"=>"error","message"=>"Debes iniciar sesión"]);
    exit;
}
$grupo_id = isset($_POST['grupo_id']) ? intval($_POST['grupo_id']) : 0;
try {
    $stmt = $conn->prepare("SELECT u.id_usuario, u.nombre FROM usuario_grupo ug JOIN usuario u ON ug.id_usuario = u.id_usuario WHERE ug.id_grupo = ?");
    $stmt->bind_param("i", $grupo_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $part = [];
    while ($r = $res->fetch_assoc()) $part[] = $r;
    echo json_encode(["status"=>"success","participantes"=>$part], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
}
?>
