<?php
session_start();
include "conexion.php";
header("Content-Type: application/json; charset=utf-8");
if (!isset($_SESSION['id_usuario'])) {
    echo json_encode(["status"=>"error","message"=>"Debes iniciar sesión"]);
    exit;
}
$grupo_id = isset($_POST['grupo_id']) ? intval($_POST['grupo_id']) : 0;
$participantes = isset($_POST['participantes']) ? $_POST['participantes'] : [];

try {
    // validar cupo
    $stmtG = $conn->prepare("SELECT max_participantes FROM grupo WHERE id_grupo = ?");
    $stmtG->bind_param("i", $grupo_id);
    $stmtG->execute();
    $g = $stmtG->get_result()->fetch_assoc();
    if (!$g) { echo json_encode(["status"=>"error","message"=>"Grupo no existe"]); exit; }
    $max = intval($g['max_participantes']);

    $stmtCount = $conn->prepare("SELECT COUNT(*) AS total FROM usuario_grupo WHERE id_grupo = ?");
    $stmtCount->bind_param("i", $grupo_id);
    $stmtCount->execute();
    $total = intval($stmtCount->get_result()->fetch_assoc()['total']);

    if ($total + count($participantes) > $max) {
        echo json_encode(["status"=>"error","message"=>"No hay cupo suficiente"]);
        exit;
    }

    $stmtIns = $conn->prepare("INSERT INTO usuario_grupo (id_usuario, id_grupo, rol, puntos_totales) VALUES (?, ?, 'miembro', 0)");
    foreach ($participantes as $idUser) {
        $idUser = intval($idUser);
        $stmtIns->bind_param("ii", $idUser, $grupo_id);
        $stmtIns->execute();
    }
    echo json_encode(["status"=>"success","message"=>"Miembros agregados"]);
} catch (Exception $e) {
    echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
}
?>
