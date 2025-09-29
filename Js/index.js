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

  // ===== BLOQUEAR LINKS PROTEGIDOS =====
  /*const protectedLinks = document.querySelectorAll(
    'a[href="pronosticos.html"], ' +
    'a[href="grupos.html"], ' + 
    'a[href="ranking.html"], ' +
    'a[href="tareas.html"], ' +
    'a[href="chat.html"], ' +
    'button.btn-primary, ' +
    'button.btn-secondary'
  );

  protectedLinks.forEach(el => {
    el.addEventListener("click", async (e) => {
      // Solo aplicar validación a elementos que no sean login/registro
      if (el.getAttribute('href') === 'login.html' || 
          el.getAttribute('href') === 'register.html') {
        return; // Dejar que estos links funcionen normalmente
      }

      e.preventDefault();
      console.log('Link protegido clickeado:', el);

      try {
        const res = await fetch("php/session.php", {
          method: "GET",
          credentials: "include"
        });
        
        if (res.ok) {
          const data = await res.json();
          
          if (data.logged_in) {
            // ✅ Usuario loggeado
            if (el.tagName.toLowerCase() === "a") {
              window.location.href = el.getAttribute("href");
            } else {
              // Para botones, podrías mostrar un modal o algo específico
              alert("Función disponible para usuarios registrados");
            }
          } else {
            // 🚫 Usuario no loggeado
            alert("Por favor inicia sesión para acceder a esta función");
            window.location.href = "login.html";
          }
        } else {
          throw new Error('Error en la respuesta del servidor');
        }
      } catch (err) {
        console.error("Error comprobando sesión:", err);
        alert("Error de conexión. Intenta de nuevo.");
      }
    });
  });*/

  // ===== FUNCIONALIDADES EXTRAS DE script.js =====
  
  // Loading screen (si existe)
  const loadingScreen = document.querySelector('.loading-screen');
  if (loadingScreen) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 500);
      }, 1500);
    });
  }

  // Menú hamburguesa para móviles (si existe)
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    // Cerrar menú al hacer clic en un enlace
    document.querySelectorAll('.nav-menu a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  }

  // Smooth scroll para enlaces internos
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: 'smooth'
        });
      }
    });
  });

  // Selector de equipo (si existe)
  const teamButtons = document.querySelectorAll('.select-team-btn');
  teamButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const team = btn.getAttribute('data-team');
      alert(`Has seleccionado a ${team.charAt(0).toUpperCase() + team.slice(1)} como tu equipo!`);
      btn.textContent = 'Seleccionado ✓';
      btn.disabled = true;
      btn.style.background = '#4CAF50';
    });
  });

  // Simulación de chat básica (si existe)
  const sendButton = document.querySelector('.send-btn');
  const messageInput = document.querySelector('.message-input input');

  if (sendButton && messageInput) {
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });

    function sendMessage() {
      const message = messageInput.value.trim();
      if (message) {
        const messagesContainer = document.querySelector('.chat-messages');
        if (messagesContainer) {
          const newMessage = document.createElement('div');
          newMessage.className = 'message sent';
          newMessage.innerHTML = `
            <div class="message-content">
              <div class="message-bubble">
                <p>${message}</p>
                <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
          `;
          messagesContainer.appendChild(newMessage);
          messageInput.value = '';
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }
    }
  }

  console.log('Script unificado cargado completamente');
});