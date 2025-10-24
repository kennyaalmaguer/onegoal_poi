<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json; charset=utf-8');
include "conexion.php";

// Detectar base URL
$projectPath = str_replace('/php', '', dirname($_SERVER['SCRIPT_NAME']));
$baseURL = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") .
           "://" . $_SERVER['HTTP_HOST'] . $projectPath . "/";

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';

$id_chat = 0;
$id_usuario = 0;
$contenido = "";
$tipo = "texto";

// ------------------------------------------------
//  Si es mensaje de texto (JSON)
// ------------------------------------------------
if (strpos($contentType, 'application/json') !== false) {
    $data = json_decode(file_get_contents("php://input"), true);

    $id_chat = intval($data['id_chat'] ?? 0);
    $id_usuario = intval($data['id_usuario'] ?? 0);
    $contenido = trim($data['contenido'] ?? "");
    $tipo = $data['tipo'] ?? 'texto';

    if (!$id_chat || !$id_usuario || $contenido === "") {
        echo json_encode(["success" => false, "error" => "Datos incompletos (JSON)"]);
        exit;
    }
}

// ------------------------------------------------
//  Si es mensaje con archivo (FormData)
// ------------------------------------------------
elseif (!empty($_FILES['archivo']) && isset($_POST['id_chat']) && isset($_POST['id_usuario'])) {

    $id_chat = intval($_POST['id_chat']);
    $id_usuario = intval($_POST['id_usuario']);

    // Valor inicial por defecto
    $tipo = 'archivo';

    $uploadDir = __DIR__ . '/../uploads/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $fileName = time() . "_" . basename($_FILES['archivo']['name']);
    $filePath = $uploadDir . $fileName;

    if (!move_uploaded_file($_FILES['archivo']['tmp_name'], $filePath)) {
        echo json_encode(["success" => false, "error" => "Error al subir archivo"]);
        exit;
    }

    $contenido = "uploads/" . $fileName;
    $rutaDestino = $filePath;

    //  Detectar MIME (con fallback)
    $mime = @mime_content_type($rutaDestino);
    $ext = strtolower(pathinfo($rutaDestino, PATHINFO_EXTENSION));

    if ($mime) {
        if (strpos($mime, 'image/') === 0) {
            $tipo = 'imagen';
        } elseif (strpos($mime, 'video/') === 0) {
            $tipo = 'video';
        } elseif (strpos($mime, 'audio/') === 0) {
            $tipo = 'audio';
        } elseif (strpos($mime, 'application/') === 0 || in_array($ext, ['pdf','doc','docx','xls','xlsx','ppt','pptx','zip','rar','txt'])) {
            $tipo = 'archivo';
        } else {
            $tipo = 'archivo';
        }
    } else {
        //  Fallback por extensión si no se detectó MIME
        if (in_array($ext, ['jpg','jpeg','png','gif','webp'])) $tipo = 'imagen';
        elseif (in_array($ext, ['mp4','mov','avi','mkv'])) $tipo = 'video';
        elseif (in_array($ext, ['mp3','wav','ogg'])) $tipo = 'audio';
        else $tipo = 'archivo';
    }

    $contenidoURL = $baseURL . $contenido;

    //  Guardar en la base de datos
    $stmt = $conn->prepare("
        INSERT INTO mensaje (id_chat, id_usuario, contenido, tipo, cifrado, fecha_envio)
        VALUES (?, ?, ?, ?, 0, NOW())
    ");
    $stmt->bind_param("iiss", $id_chat, $id_usuario, $contenido, $tipo);
    $success = $stmt->execute();

    echo json_encode([
        "success" => $success,
        "error" => $success ? null : $stmt->error,
        "contenido" => $contenidoURL,
        "tipo" => $tipo,
        "mime_detectado" => $mime ?: 'No detectado',
        "url" => $contenidoURL
    ]);
    exit;
}


if (empty($tipo)) $tipo = 'texto';

$stmt = $conn->prepare("
    INSERT INTO mensaje (id_chat, id_usuario, contenido, tipo, cifrado, fecha_envio)
    VALUES (?, ?, ?, ?, 0, NOW())
");
$stmt->bind_param("iiss", $id_chat, $id_usuario, $contenido, $tipo);
$success = $stmt->execute();

echo json_encode([
    "success" => $success,
    "error" => $success ? null : $stmt->error,
    "contenido" => isset($contenidoURL) ? $contenidoURL : $contenido,
    "tipo" => $tipo,
    "url" => isset($contenidoURL) ? $contenidoURL : null
]);
?>