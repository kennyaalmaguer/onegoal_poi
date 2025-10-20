
<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode([]);
    exit;
}

require_once 'database.php';

$user_id = $_SESSION['user_id'];

try {
    $stmt = $pdo->prepare("
        SELECT partido_id 
        FROM pronosticos 
        WHERE usuario_id = ?
    ");
    $stmt->execute([$user_id]);
    $pronosticos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($pronosticos);
    
} catch (PDOException $e) {
    echo json_encode([]);
}
?>
