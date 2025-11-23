<?php
session_start();
header('Content-Type: application/json');

$host = "127.0.0.1:3306";
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
        echo json_encode([]);
        exit;
    }

    // Consulta corregida - usar nombres de tablas correctos
    $sql = "SELECT id_partido as partido_id 
            FROM Pronostico 
            WHERE id_usuario = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id_usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $pronosticos = [];
    while ($row = $result->fetch_assoc()) {
        $pronosticos[] = $row;
    }
    
    echo json_encode($pronosticos);
    
} catch (Exception $e) {
    echo json_encode([]);
}

$conn->close();
?>