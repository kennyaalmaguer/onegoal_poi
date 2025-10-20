<?php
session_start();
header('Content-Type: application/json');

$host = "127.0.0.1:3307";
$usuario = "root";
$clave = "";
$bd = "onegoal";

$conn = new mysqli($host, $usuario, $clave, $bd);
if ($conn->connect_error) {
    die(json_encode(['error' => 'Error de conexión: ' . $conn->connect_error]));
}

try {
    $id_usuario = isset($_SESSION['id_usuario']) ? $_SESSION['id_usuario'] : null;
    
    if (!$id_usuario) {
        echo json_encode(['success' => false, 'error' => 'Usuario no autenticado']);
        exit;
    }

    $sql = "SELECT g.id_grupo, g.nombre, ug.rol 
            FROM grupo g 
            JOIN usuario_grupo ug ON g.id_grupo = ug.id_grupo 
            WHERE ug.id_usuario = ? 
            ORDER BY g.nombre";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id_usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $groups = [];
    while ($row = $result->fetch_assoc()) {
        $groups[] = [
            'id' => $row['id_grupo'],
            'name' => $row['nombre'],
            'role' => $row['rol'],
            'isAdmin' => $row['rol'] === 'creador'
        ];
    }
    
    echo json_encode([
        'success' => true,
        'groups' => $groups
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error al obtener grupos: ' . $e->getMessage()
    ]);
}

$conn->close();
?>