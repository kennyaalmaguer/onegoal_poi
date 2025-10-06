<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once 'conexion.php';
header('Content-Type: application/json; charset=utf-8');

$currentUserId = isset($_SESSION['id_usuario']) ? intval($_SESSION['id_usuario']) : 0;

$sql = "SELECT id_usuario, nombre, foto_perfil FROM usuario WHERE id_usuario != ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $currentUserId);
$stmt->execute();
$result = $stmt->get_result();

$usuarios = [];
while ($row = $result->fetch_assoc()) {
    if (!empty($row['foto_perfil'])) {
        // Convertimos el BLOB a base64
        $row['foto_perfil'] = 'data:image/jpeg;base64,' . base64_encode($row['foto_perfil']);
    } else {
        $row['foto_perfil'] = null;
    }
    $usuarios[] = $row;
}

echo json_encode([
    'success' => true,
    'usuarios' => $usuarios
]);