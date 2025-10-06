<?php
include "conexion.php";

$data = json_decode(file_get_contents("php://input"), true);

$id_chat = intval($data['id_chat']);
$id_usuario = intval($data['id_usuario']);
$contenido = $data['contenido'];
$tipo = $data['tipo'] ?? 'texto';

$sql = "INSERT INTO mensaje (id_chat, id_usuario, contenido, tipo, cifrado, fecha_envio)
        VALUES (?, ?, ?, ?, 0, NOW())";

$stmt = $conn->prepare($sql);
$stmt->bind_param("iiss", $id_chat, $id_usuario, $contenido, $tipo);
$success = $stmt->execute();

echo json_encode(["success" => $success]);
?>