<?php
session_start();
include "conexion.php";
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["status"=>"error","message"=>"Método no permitido"]);
    exit;
}

if (!isset($_SESSION["id_usuario"])) {
    echo json_encode(["status"=>"error","message"=>"Debes iniciar sesión"]);
    exit;
}

$idUsuario = $_SESSION["id_usuario"];
$idGrupo = intval($_POST["grupo_id"] ?? 0);
$estado = isset($_POST["estado"]) ? $_POST["estado"] : null;

if (!$idGrupo || !in_array($estado, ["Activo","Inactivo"])) {
    echo json_encode(["status"=>"error","message"=>"Datos inválidos"]);
    exit;
}

try {
    // validar que el usuario sea creador/admin
    $stmt = $conn->prepare("SELECT g.id_creador, u.es_admin 
                            FROM grupo g 
                            JOIN usuario u ON u.id_usuario = ?
                            WHERE g.id_grupo = ?");
    $stmt->bind_param("ii", $idUsuario, $idGrupo);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();

    if (!$res || ($res["id_creador"] != $idUsuario && $res["es_admin"] != 1)) {
        echo json_encode(["status"=>"error","message"=>"No tienes permisos"]);
        exit;
    }

    // actualizar estado al valor enviado
    $stmt2 = $conn->prepare("UPDATE grupo SET estado = ? WHERE id_grupo = ?");
    $stmt2->bind_param("si", $estado, $idGrupo);
    $stmt2->execute();

    echo json_encode(["status"=>"success","message"=>"Grupo actualizado a: $estado"]);
} catch(Exception $e) {
    echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
}
?>