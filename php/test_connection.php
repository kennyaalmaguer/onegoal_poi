<?php
echo "<h2>Probando conexión MySQL...</h2>";

$host = "127.0.0.1:3307";
$usuario = "root";
$clave = "";
$bd = "onegoal";

$conn = new mysqli($host, $usuario, $clave, $bd);

if ($conn->connect_error) {
    echo "<p style='color: red;'>❌ Error de conexión: " . $conn->connect_error . "</p>";
    
    // Más información para debug
    echo "<p>Host: " . $host . "</p>";
    echo "<p>Usuario: " . $usuario . "</p>";
    echo "<p>Base de datos: " . $bd . "</p>";
} else {
    echo "<p style='color: green;'>✅ Conexión exitosa al puerto 3307!</p>";
    
    // Verificar si la base de datos existe
    $result = $conn->query("SHOW TABLES");
    if ($result->num_rows > 0) {
        echo "<p>✅ Tablas encontradas: " . $result->num_rows . "</p>";
    } else {
        echo "<p>⚠️ La base de datos está vacía o no existe</p>";
    }
    
    $conn->close();
}
?>