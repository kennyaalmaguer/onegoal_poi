<?php
include "conexion.php";

$id_chat = intval($_GET['id_chat']);

$sql = "SELECT m.id_mensaje, m.id_usuario, u.nombre, u.foto_perfil, m.contenido, m.tipo, m.fecha_envio
        FROM mensaje m
        JOIN usuario u ON m.id_usuario = u.id_usuario
        WHERE m.id_chat = ?
        ORDER BY m.fecha_envio ASC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id_chat);
$stmt->execute();
$result = $stmt->get_result();

$messages = [];
while ($row = $result->fetch_assoc()) {
    $messages[] = $row;
}

header("Content-Type: application/json");
echo json_encode($messages);
?>