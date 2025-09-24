document.addEventListener("DOMContentLoaded", () => {
  
  const protectedLinks = document.querySelectorAll(
    'a[href="pronosticos.html"], ' +
    'a[href="torneos.html"], ' +
    'a[href="ranking.html"], ' +
    'a[href="tareas.html"], ' +
    'a[href="chat.html"], ' +
    'button.btn-primary, ' +     // botón "Crear Grupo"
    'button.btn-secondary, ' +   // botón "Ver Pronósticos"
    'section.torneos button'     // botones "Escoger equipo"
  );

  protectedLinks.forEach(el => {
    el.addEventListener("click", async (e) => {
      e.preventDefault(); // Bloqueamos el click mientras validamos

      try {
        const res = await fetch("php/session.php", {
          method: "GET",
          credentials: "include" // 👈 manda cookies de sesión
        });
        const data = await res.json();

        if (data.logged_in) {
          // ✅ Usuario loggeado → deja pasar
          if (el.tagName.toLowerCase() === "a") {
            window.location.href = el.getAttribute("href");
          } else {
            
            alert("Función disponible ✅ (usuario loggeado)");
          }
        } else {
          // 🚫 Usuario no loggeado → alerta y redirige al login
          alert("Por favor inicia sesión");
          window.location.href = "../login.html";
        }
      } catch (err) {
        console.error("Error comprobando sesión:", err);
        alert("Error de conexión. Intenta de nuevo.");
      }
    });
  });
});