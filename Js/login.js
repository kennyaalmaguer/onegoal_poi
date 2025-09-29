document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");

  if (error) {
    const msg = document.getElementById("mensaje-error");
    if (msg) {
      if (error === "contraseña") {
        msg.textContent = "Contraseña incorrecta.";
      } else if (error === "usuario") {
        msg.textContent = "Usuario no encontrado.";
      }
      msg.style.display = "block";

      // Ocultar después de 3 segundos
      setTimeout(() => {
        msg.style.display = "none";
      }, 3000);
    }
  }
});