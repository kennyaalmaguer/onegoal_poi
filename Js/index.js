// Esperar a que el DOM esté completamente cargado
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

  // ===== GESTIÓN DE SESIÓN DE USUARIO =====
  function updateUserMenu() {
    const guestOptions = document.querySelector('.guest-options');
    const loggedOptions = document.querySelector('.logged-options');
    const userNameElement = document.querySelector('.user-name');
    const userEmailElement = document.querySelector('.user-email');
    const loginItem = document.querySelector('.login-item');
    
    // Verificar si hay sesión
    const userLoggedIn = localStorage.getItem('userLoggedIn');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    if (userLoggedIn && userData) {
      // Usuario logueado
      if (guestOptions) guestOptions.style.display = 'none';
      if (loggedOptions) loggedOptions.style.display = 'block';
      if (loginItem) loginItem.style.display = 'none';
      
      if (userNameElement) {
        userNameElement.textContent = userData.name || 'Usuario';
      }
      if (userEmailElement) {
        userEmailElement.textContent = userData.email || '';
      }
      
      if (userMenu) userMenu.classList.add('user-logged');
    } else {
      // Usuario no logueado
      if (guestOptions) guestOptions.style.display = 'block';
      if (loggedOptions) loggedOptions.style.display = 'none';
      if (loginItem) loginItem.style.display = 'block';
      
      if (userMenu) userMenu.classList.remove('user-logged');
    }
  }

  // ===== CERRAR SESIÓN =====
  function setupLogout() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
          // Limpiar datos de sesión
          localStorage.removeItem('userLoggedIn');
          localStorage.removeItem('userData');
          
          // Cerrar sesión en el servidor (si usas PHP)
          logoutPHP();
          
          // Actualizar el menú
          updateUserMenu();
          window.location.href = 'index.html';
        }
      });
    }
  }

  // ===== LOGOUT CON PHP =====
  async function logoutPHP() {
    try {
      const res = await fetch("php/logout.php", {
        method: "POST",
        credentials: "include"
      });
      
      if (res.ok) {
        console.log('Sesión cerrada correctamente en el servidor');
      }
    } catch (err) {
      console.error("Error cerrando sesión en el servidor:", err);
    }
  }

  // ===== VERIFICAR SESIÓN CON PHP =====
  async function checkSession() {
    try {
      const res = await fetch("php/session.php", {
        method: "GET",
        credentials: "include"
      });
      
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {
      console.error("Error comprobando sesión:", err);
    }
    return { logged_in: false };
  }

 /* // ===== BLOQUEAR LINKS PROTEGIDOS =====
  const protectedLinks = document.querySelectorAll(
    'a[href="pronosticos.html"], ' +
    'a[href="grupos.html"], ' + 
    'a[href="ranking.html"], ' +
    'a[href="tareas.html"], ' +
    'a[href="chat.html"], ' +
    'button.btn-primary, ' +
    'button.btn-secondary'
  );*/

  protectedLinks.forEach(el => {
    el.addEventListener("click", async (e) => {
      if (el.getAttribute('href') === 'login.html' || 
          el.getAttribute('href') === 'register.html') {
        return;
      }

      e.preventDefault();
      console.log('Link protegido clickeado:', el);

      try {
        const sessionData = await checkSession();
        
        if (sessionData.logged_in) {
          if (el.tagName.toLowerCase() === "a") {
            window.location.href = el.getAttribute("href");
          } else {
            handleButtonAction(el);
          }
        } else {
          alert("Por favor inicia sesión para acceder a esta función");
          window.location.href = "login.html";
        }
      } catch (err) {
        console.error("Error comprobando sesión:", err);
        alert("Error de conexión. Intenta de nuevo.");
      }
    });
  });

  // ===== MANEJAR ACCIONES DE BOTONES =====
  function handleButtonAction(button) {
    const buttonText = button.textContent.trim();
    
    switch(buttonText) {
      case 'Crear Grupo':
        window.location.href = 'grupos.html';
        break;
      case 'Ver Pronósticos':
        window.location.href = 'pronosticos.html';
        break;
      case 'Registrate':
        window.location.href = 'register.html';
        break;
      case 'Iniciar Sesión':
        window.location.href = 'login.html';
        break;
      default:
        alert("Función disponible para usuarios registrados");
    }
  }

  // ===== SIMULACIÓN DE LOGIN (PARA PRUEBAS) =====
  function simulateLogin() {
    const userData = {
      name: "Juan Pérez",
      email: "juan@example.com"
    };
    
    localStorage.setItem('userLoggedIn', 'true');
    localStorage.setItem('userData', JSON.stringify(userData));
    updateUserMenu();
    alert('Sesión simulada iniciada para: ' + userData.name);
  }

  // ===== INICIALIZAR FUNCIONALIDADES DE SESIÓN =====
  updateUserMenu();
  setupLogout();

  // Botón de simulación de login (eliminar en producción)
  const simulateLoginBtn = document.createElement('button');
  simulateLoginBtn.textContent = 'Simular Login';
  simulateLoginBtn.style.position = 'fixed';
  simulateLoginBtn.style.bottom = '10px';
  simulateLoginBtn.style.right = '10px';
  simulateLoginBtn.style.zIndex = '1000';
  simulateLoginBtn.style.padding = '5px 10px';
  simulateLoginBtn.style.background = '#007bff';
  simulateLoginBtn.style.color = 'white';
  simulateLoginBtn.style.border = 'none';
  simulateLoginBtn.style.borderRadius = '3px';
  simulateLoginBtn.style.cursor = 'pointer';
  simulateLoginBtn.addEventListener('click', simulateLogin);
  document.body.appendChild(simulateLoginBtn);

  console.log('Script unificado cargado completamente');
});