<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/errores_llamadas.log');

require_once 'db.php';
$method = $_SERVER['REQUEST_METHOD'];

try {
    // ============================================
    // GET Obtener historial de llamadas de un chat
    // ============================================
    if ($method === 'GET') {
        if (!isset($_GET['chatId']) && !isset($_GET['grupoId'])) {
            http_response_code(400);
            echo json_encode(["error" => "Falta el parámetro chatId o grupoId"]);
            exit;
        }

        if (isset($_GET['chatId'])) {
            $id = intval($_GET['chatId']);
            $condicion = "l.id_chat = ?";
        } else {
            $id = intval($_GET['grupoId']);
            $condicion = "l.id_grupo = ?";
        }

        $sql = "SELECT 
                    l.idLlamada,
                    l.id_chat,
                    l.id_grupo,
                    l.idUsuarioEmisor,
                    l.idUsuarioReceptor,
                    l.tipo,
                    l.estado,
                    l.fecha,
                    l.duracion,
                    u.nombre AS nombre_emisor,
                    LEFT(u.nombre, 1) AS inicial
                FROM llamada l
                INNER JOIN usuario u ON u.id_usuario = l.idUsuarioEmisor
                WHERE $condicion
                ORDER BY l.fecha DESC";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();

        $llamadas = [];
        while ($row = $result->fetch_assoc()) {
            $llamadas[] = $row;
        }

        echo json_encode($llamadas);
        exit;
    }

    // ============================================
    // POST  Registrar una nueva llamada
    // ============================================
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data) {
            http_response_code(400);
            echo json_encode(["error" => "No se recibieron datos JSON válidos"]);
            exit;
        }

        $required = ['idUsuarioEmisor', 'tipo', 'estado'];
        foreach ($required as $campo) {
            if (!isset($data[$campo]) || $data[$campo] === '') {
                http_response_code(400);
                echo json_encode(["error" => "Falta el campo: $campo"]);
                exit;
            }
        }

        $idChat = !empty($data['idChat']) ? intval($data['idChat']) : null;
        $idGrupo = !empty($data['idGrupo']) ? intval($data['idGrupo']) : null;
        $idUsuarioEmisor = intval($data['idUsuarioEmisor']);
        $idUsuarioReceptor = isset($data['idUsuarioReceptor']) && $data['idUsuarioReceptor'] != 0
        ? intval($data['idUsuarioReceptor'])
        : null;
        $tipo = $data['tipo'];
        $estado = $data['estado'];
        error_log("Datos recibidos: " . print_r($data, true));
        $sql = "INSERT INTO llamada (id_chat, id_grupo, idUsuarioEmisor, idUsuarioReceptor, tipo, estado, fecha)
                VALUES (?, ?, ?, ?, ?, ?, NOW())";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param(
            "iiiiss",
            $idChat,
            $idGrupo,
            $idUsuarioEmisor,
            $idUsuarioReceptor,
            $tipo,
            $estado
        );
        $stmt->execute();

        if ($stmt->affected_rows > 0) {
            echo json_encode([
                "status" => "ok",
                "message" => "Llamada registrada exitosamente",
                "idLlamada" => $stmt->insert_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "No se pudo registrar la llamada"]);
        }

        exit;
    }

    // ============================================
    // OPTIONS Preflight CORS
    // ============================================
    elseif ($method === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    // ============================================
    // Método no permitido
    // ============================================
    else {
        http_response_code(405);
        echo json_encode(["error" => "Método no permitido"]);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Error en el servidor",
        "details" => $e->getMessage()
    ]);
    error_log("Error en api_llamadas.php: " . $e->getMessage());
}
?>
