<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once 'conexion.php';
header('Content-Type: application/json; charset=utf-8');

// Verifica que el usuario esté logueado
if (!isset($_SESSION['id_usuario'])) {
    echo json_encode(['success' => false, 'message' => 'Usuario no autenticado']);
    exit;
}

$currentUserId = intval($_SESSION['id_usuario']);

//  Obtener información del usuario actual
$sqlUser = "SELECT id_usuario, nombre, foto_perfil, estado_conexion FROM usuario WHERE id_usuario = ?";
$stmtUser = $conn->prepare($sqlUser);
$stmtUser->bind_param("i", $currentUserId);
$stmtUser->execute();
$resultUser = $stmtUser->get_result();
$currentUser = $resultUser->fetch_assoc();

if ($currentUser && !empty($currentUser['foto_perfil'])) {
    $currentUser['foto_perfil'] = 'data:image/jpeg;base64,' . base64_encode($currentUser['foto_perfil']);
} elseif ($currentUser) {
    $currentUser['foto_perfil'] = null;
}

// Obtener lista de los demás usuarios
$sqlUsers = "SELECT id_usuario, nombre, foto_perfil, estado_conexion FROM usuario WHERE id_usuario != ?";
$stmtUsers = $conn->prepare($sqlUsers);
$stmtUsers->bind_param("i", $currentUserId);
$stmtUsers->execute();
$resultUsers = $stmtUsers->get_result();

$usuarios = [];
while ($row = $resultUsers->fetch_assoc()) {
    if (!empty($row['foto_perfil'])) {
        $row['foto_perfil'] = 'data:image/jpeg;base64,' . base64_encode($row['foto_perfil']);
    } else {
        $row['foto_perfil'] = null;
    }
    $usuarios[] = $row;
}

// Enviar todo junto
echo json_encode([
    'success' => true,
    'current_user' => $currentUser,
    'usuarios' => $usuarios
]);
