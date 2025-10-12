<?php
include "conexion.php";
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents("php://input"), true);
$id_usuario1 = intval($data['id_usuario1']);
$id_usuario2 = intval($data['id_usuario2']);

if (!$id_usuario1 || !$id_usuario2) {
    echo json_encode(["success" => false, "error" => "IDs de usuario inválidos"]);
    exit;
}

// Verificar si ya existe un chat entre ambos
$sql = "SELECT cu1.id_chat 
        FROM chat_usuario cu1 
        JOIN chat_usuario cu2 ON cu1.id_chat = cu2.id_chat
        WHERE cu1.id_usuario = ? AND cu2.id_usuario = ?
        LIMIT 1";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $id_usuario1, $id_usuario2);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode(["success" => true, "id_chat" => $row['id_chat'], "new" => false]);
    exit;
}

// Crear nuevo chat
$conn->query("INSERT INTO chat (tipo) VALUES ('privado')");
$id_chat = $conn->insert_id;

$stmt2 = $conn->prepare("INSERT INTO chat_usuario (id_chat, id_usuario) VALUES (?, ?), (?, ?)");
$stmt2->bind_param("iiii", $id_chat, $id_usuario1, $id_chat, $id_usuario2);
$stmt2->execute();

echo json_encode(["success" => true, "id_chat" => $id_chat, "new" => true]);