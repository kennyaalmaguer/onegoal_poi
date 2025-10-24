<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json; charset=utf-8');
include "conexion.php";

$id_chat = intval($_GET['id_chat'] ?? 0);

// ✅ Detectar URL base automáticamente
$projectPath = str_replace('/php', '', dirname($_SERVER['SCRIPT_NAME']));
$baseURL = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http")
         . "://" . $_SERVER['HTTP_HOST'] . $projectPath . "/";

$sql = "SELECT m.id_mensaje, m.id_usuario, m.contenido, m.tipo, m.fecha_envio, u.nombre
        FROM mensaje m
        JOIN usuario u ON m.id_usuario = u.id_usuario
        WHERE m.id_chat = ?
        ORDER BY m.fecha_envio ASC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id_chat);
$stmt->execute();
$result = $stmt->get_result();

$mensajes = [];
while ($row = $result->fetch_assoc()) {
 $mediaTypes = ['imagen', 'video', 'audio', 'archivo'];

if (in_array($row['tipo'], $mediaTypes) && !empty($row['contenido'])) {
    if (!preg_match('/^https?:\/\//', $row['contenido'])) {
        $row['contenido'] = $baseURL . $row['contenido'];
    }
}
    $mensajes[] = $row;

}

echo json_encode($mensajes);
?>