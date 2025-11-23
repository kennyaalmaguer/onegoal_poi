<?php
session_start();
header('Content-Type: application/json');

$host = "127.0.0.1:3306";
$usuario = "root";
$clave = "";
$bd = "onegoal";

$conn = new mysqli($host, $usuario, $clave, $bd);
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'error' => 'Error de conexión: ' . $conn->connect_error]);
    exit;
}

try {
    // CONSULTA SIMPLIFICADA - SOLO LEE MEDALLAS EXISTENTES
    $sql = "SELECT 
                u.id_usuario,
                u.nombre as username,
                COALESCE(u.puntos_totales, 0) as points,
                GROUP_CONCAT(DISTINCT m.nombre) as medallas
            FROM Usuario u
            LEFT JOIN usuario_medalla um ON u.id_usuario = um.id_usuario
            LEFT JOIN medalla m ON um.id_medalla = m.id_medalla
            GROUP BY u.id_usuario
            ORDER BY u.puntos_totales DESC";

    $result = $conn->query($sql);
    
    $users = [];
    $currentUserId = isset($_SESSION['id_usuario']) ? $_SESSION['id_usuario'] : null;
    
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $user = [
                'id' => $row['id_usuario'],
                'username' => $row['username'],
                'points' => (int)$row['points'],
                'medallas' => $row['medallas'] ? explode(',', $row['medallas']) : [],
                'isCurrentUser' => ($currentUserId && $row['id_usuario'] == $currentUserId)
            ];
            $users[] = $user;
        }
    }
    
    echo json_encode([
        'success' => true,
        'users' => $users,
        'totalUsers' => count($users)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error: ' . $e->getMessage()
    ]);
}

$conn->close();
?>