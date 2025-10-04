<?php
session_start();
include "conexion.php";
header("Content-Type: application/json; charset=utf-8");

if (!isset($_SESSION["id_usuario"])) {
    echo json_encode([]);
    exit;
}

$idUsuario = intval($_SESSION["id_usuario"]);
$grupo_id = isset($_POST['grupo_id']) ? intval($_POST['grupo_id']) : 0;

try {
    if ($grupo_id > 0) {
        // usuarios que NO están en el grupo y que no sean el usuario actual
        $stmt = $conn->prepare("
            SELECT u.id_usuario, u.nombre
            FROM usuario u
            WHERE u.id_usuario NOT IN (
                SELECT id_usuario FROM usuario_grupo WHERE id_grupo = ?
            ) AND u.id_usuario != ?
        ");
        $stmt->bind_param("ii", $grupo_id, $idUsuario);
        $stmt->execute();
        $res = $stmt->get_result();
        $users = [];
        while ($row = $res->fetch_assoc()) $users[] = $row;
        echo json_encode($users, JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        // todos los usuarios excepto el propio
        $res = $conn->prepare("SELECT id_usuario, nombre FROM usuario WHERE id_usuario != ?");
        $res->bind_param("i", $idUsuario);
        $res->execute();
        $resultado = $res->get_result();
        $usuarios = [];
        while($row = $resultado->fetch_assoc()){
            $usuarios[] = $row;
        }
        echo json_encode($usuarios, JSON_UNESCAPED_UNICODE);
        exit;
    }
} catch(Exception $e){
    echo json_encode([]);
    exit;
}
?>