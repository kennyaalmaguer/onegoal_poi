// debug.js - Agregar temporalmente
console.log("✅ Debug cargado");

// Verificar si los elementos existen
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM cargado");
    
    const chatsPanel = document.getElementById('chatsPanel');
    const chatPanel = document.getElementById('chatPanel');
    const chatItems = document.querySelectorAll('.chat-item');
    
    console.log("chatsPanel:", chatsPanel);
    console.log("chatPanel:", chatPanel);
    console.log("chatItems encontrados:", chatItems.length);
    
    // Agregar bordes de debug
    if (chatsPanel) chatsPanel.classList.add('debug-border');
    if (chatPanel) chatPanel.classList.add('debug-border-2');
    
    // Verificar tamaño de pantalla
    console.log("Ancho ventana:", window.innerWidth);
    console.log("Es móvil?", window.innerWidth <= 768);
    
    // Verificar event listeners
    chatItems.forEach((item, index) => {
        item.addEventListener('click', function() {
            console.log("✅ CLICK en chat-item:", index, this.dataset);
        });
    });
});