<?php
session_start();
include "conexion.php";
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    if (!isset($_SESSION["id_usuario"])) {
        echo json_encode(["status"=>"error","message"=>"Debes iniciar sesión"]);
        exit;
    }

    $idUsuario = $_SESSION["id_usuario"];
    $idGrupo = intval($_POST["grupo_id"]);

    try {
        // validar que el usuario sea creador/admin
        $stmt = $conn->prepare("SELECT g.id_creador, u.es_admin 
                                FROM grupo g 
                                JOIN usuario u ON u.id_usuario=? 
                                WHERE g.id_grupo=?");
        $stmt->bind_param("ii",$idUsuario,$idGrupo);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();

        if (!$res || ($res["id_creador"] != $idUsuario && $res["es_admin"] != 1)) {
            echo json_encode(["status"=>"error","message"=>"No tienes permisos"]);
            exit;
        }

        $stmt2 = $conn->prepare("UPDATE grupo SET estado='Inactivo' WHERE id_grupo=?");
        $stmt2->bind_param("i",$idGrupo);
        $stmt2->execute();

        echo json_encode(["status"=>"success","message"=>"Grupo desactivado"]);
    } catch(Exception $e){
        echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
    }
}