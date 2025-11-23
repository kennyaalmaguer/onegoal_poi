<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['id_usuario'])) {
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit;
}

require_once 'config/database.php';

$idUsuarioActual = $_SESSION['id_usuario'];

try {
    $sql = "
        SELECT 
            l.*,
            CASE 
                WHEN l.id_grupo IS NOT NULL THEN g.nombre
                WHEN l.idUsuarioEmisor = ? THEN u2.nombre
                ELSE u1.nombre
            END as nombre,
            CASE 
                WHEN l.id_grupo IS NOT NULL THEN NULL
                WHEN l.idUsuarioEmisor = ? THEN u2.foto_perfil
                ELSE u1.foto_perfil
            END as foto_perfil
        FROM llamada l
        LEFT JOIN grupo g ON l.id_grupo = g.id_grupo
        LEFT JOIN usuario u1 ON l.idUsuarioEmisor = u1.id_usuario
        LEFT JOIN usuario u2 ON l.idUsuarioReceptor = u2.id_usuario
        WHERE l.idUsuarioEmisor = ? OR l.idUsuarioReceptor = ?
        ORDER BY l.fecha DESC
        LIMIT 50
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$idUsuarioActual, $idUsuarioActual, $idUsuarioActual, $idUsuarioActual]);
    $llamadas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'llamadas' => $llamadas
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>