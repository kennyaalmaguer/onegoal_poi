document.addEventListener("DOMContentLoaded", () => {
  fetch("php/session.php")
    .then(res => res.json())
    .then(data => {
      const userIcon = document.querySelector(".user-icon img");
      const guestOptions = document.querySelector(".guest-options");
      const loggedOptions = document.querySelector(".logged-options");
      const userName = document.querySelector(".user-name");
      const userEmail = document.querySelector(".user-email");

      if (data.loggedIn) {
        // Foto de perfil (si existe, si no usar la default)
        if (data.foto_perfil) {
          userIcon.src = "data:image/jpeg;base64," + data.foto_perfil;
        } else {
          userIcon.src = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
        }

        // Datos de usuario
        userName.textContent = data.nombre;
        userEmail.textContent = data.correo;

        // Mostrar menú logueado
        guestOptions.style.display = "none";
        loggedOptions.style.display = "block";
      } else {
        // Usuario no logueado
        userIcon.src = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
        guestOptions.style.display = "block";
        loggedOptions.style.display = "none";
      }
    })
    .catch(err => console.error("Error:", err));

  // Logout
document.addEventListener("click", (e) => {
  const logoutBtn = e.target.closest(".logout-btn");
  if (logoutBtn) {
    e.preventDefault();
    fetch("php/logout.php")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log("Sesión cerrada correctamente");
          window.location.href = "index.html"; // redirige al inicio
        } else {
          console.error("No se pudo cerrar sesión");
        }
      })
      .catch(err => console.error("Error en logout:", err));
  }
});
});