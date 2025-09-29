document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM cargado - Script unificado ejecutándose');

  // ===== DROPDOWN USUARIO =====
  const userMenu = document.querySelector(".user-menu");
  const userIcon = document.querySelector(".user-icon");

  if (userMenu && userIcon) {
    console.log('Elementos del dropdown encontrados');

    userIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      userMenu.classList.toggle("active");
      console.log('Dropdown clicked - active:', userMenu.classList.contains("active"));
    });

    // Cerrar al hacer clic fuera
    document.addEventListener("click", (e) => {
      if (!userMenu.contains(e.target)) {
        userMenu.classList.remove("active");
      }
    });

    // Prevenir que clicks dentro del dropdown lo cierren
    const dropdown = document.querySelector(".dropdown");
    if (dropdown) {
      dropdown.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }
  } else {
    console.log('Dropdown elements not found:', { userMenu, userIcon });
  }

  // ===== VERIFICAR SESIÓN CON PHP =====
  async function checkSession() {
    try {
      const res = await fetch("php/session.php?nocache=" + Date.now(), {
        method: "GET",
        credentials: "include"
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error("Error comprobando sesión:", err);
    }
    return { loggedIn: false };
  }

  // ===== ACTUALIZAR MENÚ DE USUARIO =====
  async function updateUserMenu() {
    const guestOptions = document.querySelector('.guest-options');
    const loggedOptions = document.querySelector('.logged-options');
    const userNameElement = document.querySelector('.user-name');
    const userEmailElement = document.querySelector('.user-email');
    const loginItem = document.querySelector('.login-item');

    const sessionData = await checkSession();

    if (sessionData.loggedIn) {
      if (guestOptions) guestOptions.style.display = 'none';
      if (loggedOptions) loggedOptions.style.display = 'block';
      if (loginItem) loginItem.style.display = 'none';

      if (userNameElement) userNameElement.textContent = sessionData.nombre || 'Usuario';
      if (userEmailElement) userEmailElement.textContent = sessionData.correo || '';

      if (userMenu) userMenu.classList.add('user-logged');
    } else {
      if (guestOptions) guestOptions.style.display = 'block';
      if (loggedOptions) loggedOptions.style.display = 'none';
      if (loginItem) loginItem.style.display = 'block';

      if (userMenu) userMenu.classList.remove('user-logged');
    }
  }

  // ===== LOGOUT CON PHP =====
  async function logoutPHP() {
    try {
      const res = await fetch("php/logout.php", {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        console.log('Sesión cerrada correctamente en el servidor');
        window.location.href = "index.html"; // redirige siempre al inicio
      } else {
        console.error("No se pudo cerrar sesión en el servidor");
      }
    } catch (err) {
      console.error("Error cerrando sesión:", err);
    }
  }

  function setupLogout() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
          logoutPHP();
        }
      });
    }
  }

  // ===== INICIALIZAR =====
  updateUserMenu();
  setupLogout();

  console.log('Script unificado cargado completamente');
});