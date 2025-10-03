<?php

session_start();
include "conexion.php";
header("Content-Type: application/json; charset=utf-8");

try {
    if (!isset($_SESSION["id_usuario"])) {
        echo json_encode([]);
        exit;
    }
    $idUsuario = $_SESSION["id_usuario"];

    $res = $conn->prepare("SELECT id_usuario, nombre FROM usuario WHERE id_usuario != ?");
    $res->bind_param("i", $idUsuario);
    $res->execute();
    $resultado = $res->get_result();

    $usuarios = [];
    while($row = $resultado->fetch_assoc()){
        $usuarios[] = $row;
    }
    echo json_encode($usuarios, JSON_UNESCAPED_UNICODE);

} catch(Exception $e){
    echo json_encode([]);
}
?>