









// Esperar a que el DOM esté completamente cargado




document.addEventListener('DOMContentLoaded', function() {
  // Ocultar pantalla de carga después de 2 segundos
  setTimeout(() => {
    document.querySelector('.loading-screen').style.opacity = '0';
    setTimeout(() => {
      document.querySelector('.loading-screen').style.display = 'none';
    }, 500);
  }, 2000);

  // Menu hamburguesa para móviles
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });
  }

  // Cerrar menú al hacer clic en un enlace
  document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });

  // Inicializar animaciones al hacer scroll
  initAnimations();

  // Configurar el slider de equipos
  initTeamSlider();

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
});

// Inicializar animaciones al hacer scroll
function initAnimations() {
  const animatedElements = document.querySelectorAll('[data-aos]');
  
  // Si AOS está cargado, inicializarlo
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      easing: 'ease-in-out',
      once: true
    });
  } else {
    // Fallback si AOS no está disponible
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('aos-animate');
        }
      });
    }, { threshold: 0.1 });
    
    animatedElements.forEach(el => observer.observe(el));
  }
}

// Configurar el slider de equipos
function initTeamSlider() {
  const sliderContainer = document.querySelector('.slider-container');
  const prevButton = document.querySelector('.slider-nav.prev');
  const nextButton = document.querySelector('.slider-nav.next');
  
  if (!sliderContainer || !prevButton || !nextButton) return;
  
  const cardWidth = document.querySelector('.team-card').offsetWidth + 20; // width + gap
  const scrollAmount = cardWidth * 2; // Scroll 2 cards at a time
  
  nextButton.addEventListener('click', () => {
    sliderContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  });
  
  prevButton.addEventListener('click', () => {
    sliderContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  });
}

// Efecto de escritura para el título
function typeWriterEffect() {
  const titleElement = document.querySelector('.hero-title');
  if (!titleElement) return;
  
  const text = titleElement.textContent;
  titleElement.textContent = '';
  
  let i = 0;
  const speed = 100;
  
  function typeWriter() {
    if (i < text.length) {
      titleElement.textContent += text.charAt(i);
      i++;
      setTimeout(typeWriter, speed);
    }
  }
  
  // Iniciar el efecto después de que la página cargue
  setTimeout(typeWriter, 1000);
}

// Llamar a la función de efecto de escritura cuando la página cargue
window.addEventListener('load', typeWriterEffect);

/* JavaScript para funcionalidades */

// Loading screen
window.addEventListener('load', () => {
  const loadingScreen = document.querySelector('.loading-screen');
  setTimeout(() => {
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }, 1500);
});

// Menú móvil
document.querySelector('.menu-toggle').addEventListener('click', () => {
  document.querySelector('nav ul').classList.toggle('show');
});

// Modales de login/registro
const loginBtn = document.getElementById('login-btn');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const registerLink = document.getElementById('register-link');
const loginLink = document.getElementById('login-link');
const closeModals = document.querySelectorAll('.close-modal');

loginBtn.addEventListener('click', (e) => {
  e.preventDefault();
  loginModal.style.display = 'flex';
});

registerLink.addEventListener('click', (e) => {
  e.preventDefault();
  loginModal.style.display = 'none';
  registerModal.style.display = 'flex';
});

loginLink.addEventListener('click', (e) => {
  e.preventDefault();
  registerModal.style.display = 'none';
  loginModal.style.display = 'flex';
});

closeModals.forEach(closeBtn => {
  closeBtn.addEventListener('click', () => {
    loginModal.style.display = 'none';
    registerModal.style.display = 'none';
  });
});

window.addEventListener('click', (e) => {
  if (e.target === loginModal) {
    loginModal.style.display = 'none';
  }
  if (e.target === registerModal) {
    registerModal.style.display = 'none';
  }
});

// Animación de elementos al hacer scroll
const animatedElements = document.querySelectorAll('.feature-card, .point-item, .team-card, .match-card');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animation = 'fadeIn 1s ease-out forwards';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

animatedElements.forEach(el => {
  el.style.opacity = '0';
  observer.observe(el);
});

// Selector de equipo
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

// Tabs de partidos
const tabButtons = document.querySelectorAll('.tab-btn');
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Aquí iría la lógica para cargar los partidos según la fase seleccionada
  });
});

// Simulación de chat
const sendButton = document.querySelector('.send-btn');
const messageInput = document.querySelector('.message-input input');

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
    
    // Simular respuesta después de un tiempo
    setTimeout(() => {
      const responses = [
        "¡Buena predicción!",
        "Estoy de acuerdo contigo",
        "No estoy seguro, veremos qué pasa",
        "¡Vamos! ¡Ese es mi equipo!"
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const responseMessage = document.createElement('div');
      responseMessage.className = 'message received';
      responseMessage.innerHTML = `
        <div class="message-avatar">
          <img src="https://ui-avatars.com/api/?name=Juan+P&background=00509E&color=fff" alt="Juan">
        </div>
        <div class="message-content">
          <div class="message-sender">Juan Pérez</div>
          <div class="message-bubble">
            <p>${randomResponse}</p>
            <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        </div>
      `;
      messagesContainer.appendChild(responseMessage);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 1000);
  }
}

