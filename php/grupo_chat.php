<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
include "conexion.php";
header("Content-Type: application/json; charset=utf-8");

try {
    if (!isset($_SESSION["id_usuario"])) {
        echo json_encode(["status" => "error", "message" => "Usuario no autenticado"]);
        exit;
    }

    $idUsuario = intval($_SESSION["id_usuario"]);

    // Trae los grupos donde el usuario es creador o miembro
    $sql = "
        SELECT DISTINCT g.id_grupo, g.nombre, g.fecha_creacion, g.hora_creacion, 
               g.estado, g.max_participantes, g.id_creador, u.nombre AS nombre_creador
        FROM grupo g
        JOIN usuario u ON g.id_creador = u.id_usuario
        LEFT JOIN usuario_grupo ug ON g.id_grupo = ug.id_grupo
        WHERE g.id_creador = ? OR ug.id_usuario = ?
        ORDER BY g.fecha_creacion DESC, g.hora_creacion DESC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $idUsuario, $idUsuario);
    $stmt->execute();
    $res = $stmt->get_result();

    $grupos = [];
    while ($row = $res->fetch_assoc()) {
        $idGrupo = $row["id_grupo"];

      
    // Verificar si ya existe un chat para el grupo
    $stmtChat = $conn->prepare("SELECT id_chat FROM chat WHERE id_grupo = ?");
    $stmtChat->bind_param("i", $idGrupo);
    $stmtChat->execute();
    $resChat = $stmtChat->get_result()->fetch_assoc();

    if ($resChat) {
        $row["id_chat"] = $resChat["id_chat"];
    } else {
        // Insertar chat grupal
        $stmtInsert = $conn->prepare("INSERT INTO chat (id_grupo, tipo) VALUES (?, 'grupo')");
        $stmtInsert->bind_param("i", $idGrupo);
        $stmtInsert->execute();
        $row["id_chat"] = $conn->insert_id;
    }

        // Obtener participantes
        $stmtP = $conn->prepare("
            SELECT ug.id_usuario, ug.rol, us.nombre 
            FROM usuario_grupo ug 
            JOIN usuario us ON ug.id_usuario = us.id_usuario 
            WHERE ug.id_grupo = ?
        ");
        $stmtP->bind_param("i", $idGrupo);
        $stmtP->execute();
        $resP = $stmtP->get_result();

        $participantes = [];
        while ($p = $resP->fetch_assoc()) {
            $participantes[] = $p;
        }
        $row["participantes"] = $participantes;

        // Soy admin
        $stmtAdmin = $conn->prepare("SELECT es_admin FROM usuario WHERE id_usuario=?");
        $stmtAdmin->bind_param("i", $idUsuario);
        $stmtAdmin->execute();
        $resAdmin = $stmtAdmin->get_result()->fetch_assoc();
        $row["soy_admin"] = $resAdmin ? intval($resAdmin["es_admin"]) : 0;

        // Soy creador
        $row["soy_creador"] = ($row["id_creador"] == $idUsuario) ? 1 : 0;

        // Soy miembro
        $row["soy_miembro"] = $row["soy_creador"] ? 1 : (
            array_reduce($participantes, function($carry, $p) use ($idUsuario) {
                return $carry || $p["id_usuario"] == $idUsuario;
            }, false) ? 1 : 0
        );

        $grupos[] = $row;
    }

    echo json_encode([
        "status" => "success",
        "id_usuario" => $idUsuario,
        "grupos" => $grupos
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>