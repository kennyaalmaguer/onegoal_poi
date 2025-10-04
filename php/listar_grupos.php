<?php
session_start();
include "conexion.php";
header("Content-Type: application/json; charset=utf-8");

try {
    $sql = "SELECT g.id_grupo, g.nombre, g.fecha_creacion, g.hora_creacion, g.estado, g.max_participantes,
                   g.id_creador, u.nombre AS nombre_creador
            FROM grupo g
            JOIN usuario u ON g.id_creador = u.id_usuario
            ORDER BY g.fecha_creacion DESC, g.hora_creacion DESC";
    $res = $conn->query($sql);
    $grupos = [];

    while ($row = $res->fetch_assoc()) {
        $idGrupo = $row["id_grupo"];

        // participantes (lista con id_usuario)
        $stmtP = $conn->prepare("SELECT ug.id_usuario, ug.rol, us.nombre 
                                 FROM usuario_grupo ug 
                                 JOIN usuario us ON ug.id_usuario = us.id_usuario 
                                 WHERE ug.id_grupo = ?");
        $stmtP->bind_param("i", $idGrupo);
        $stmtP->execute();
        $resP = $stmtP->get_result();
        $participantes = [];
        while ($p = $resP->fetch_assoc()) {
            $participantes[] = $p;
        }
        $row["participantes"] = $participantes;

        // soy admin (usuario logueado)
        $idUsuario = isset($_SESSION["id_usuario"]) ? intval($_SESSION["id_usuario"]) : 0;
        $stmtAdmin = $conn->prepare("SELECT es_admin FROM usuario WHERE id_usuario=?");
        $stmtAdmin->bind_param("i", $idUsuario);
        $stmtAdmin->execute();
        $resAdmin = $stmtAdmin->get_result()->fetch_assoc();
        $row["soy_admin"] = $resAdmin ? $resAdmin["es_admin"] : 0;

        // soy creador?
        $row["soy_creador"] = ($row["id_creador"] == $idUsuario) ? 1 : 0;

        // soy miembro?
       $stmtMi = $conn->prepare("SELECT id_grupo FROM usuario_grupo WHERE id_usuario=?");
$stmtMi->bind_param("i", $idUsuario);
$stmtMi->execute();
$resMi = $stmtMi->get_result();

$gruposMiembro = [];
while ($r = $resMi->fetch_assoc()) {
    $gruposMiembro[$r["id_grupo"]] = true;
}
       $row["soy_miembro"] = isset($gruposMiembro[$idGrupo]) ? 1 : 0;

        $grupos[] = $row;
    }

    $idUsuario = isset($_SESSION["id_usuario"]) ? intval($_SESSION["id_usuario"]) : 0;
    echo json_encode(["status" => "success", "id_usuario" => $idUsuario, "grupos" => $grupos], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);

}


?>