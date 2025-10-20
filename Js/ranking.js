document.addEventListener("DOMContentLoaded", () => {
  // Elementos del DOM
  const rankingContainer = document.getElementById("rankingContainer");
  const paginationContainer = document.getElementById("pagination");
  const totalUsersEl = document.getElementById("totalUsers");
  const topPointsEl = document.getElementById("topPoints");
  const userPositionEl = document.getElementById("userPosition");
  
  // Configuración
  const USERS_PER_PAGE = 10;
  let currentPage = 1;
  let allUsers = [];
  let currentUser = null;
  
  // Definición de niveles
  const LEVELS = {
    1: { name: "NOVATO", min: 0, max: 20 },
    2: { name: "FANATICO", min: 21, max: 50 },
    3: { name: "ANALISTA", min: 51, max: 100 },
    4: { name: "LEYENDA", min: 101, max: Infinity }
  };
  
  // Definición de medallas
  const BADGES = {
    oracle: {
      id: "oracle",
      name: "🔮 ORÁCULO",
      description: "3 marcadores exactos seguidos",
      condition: (user) => user.exactPredictions >= 3
    },
    speed: {
      id: "speed", 
      name: "⚡ VELOCISTA",
      description: "Entregar pronósticos antes de 24h",
      condition: (user) => user.quickPredictions >= 5
    },
    collab: {
      id: "collab",
      name: "🤝 COLABORADOR", 
      description: "Más de 10 tareas completadas",
      condition: (user) => user.completedTasks >= 10
    },
    convincer: {
      id: "convincer",
      name: "💬 CONVENCEDOR",
      description: "50 mensajes en chats",
      condition: (user) => user.chatMessages >= 50
    }
  };

  // Iniciar carga del ranking
  loadRankingData();

  // Cargar datos del ranking desde la base de datos
  function loadRankingData() {
    rankingContainer.innerHTML = '<div class="loading">Cargando ranking...</div>';
    
    fetch('php/ranking.php')
      .then(response => {
        if (!response.ok) {
          throw new Error('Error en la respuesta del servidor: ' + response.status);
        }
        return response.json();
      })
      .then(data => {
        console.log('Datos recibidos:', data); // Para debug
        
        if (data.success) {
          allUsers = data.users;
          
          if (allUsers.length === 0) {
            showNoUsers();
            return;
          }
          
          // Buscar y marcar usuario actual
          const currentUserIndex = allUsers.findIndex(user => user.isCurrentUser);
          if (currentUserIndex !== -1) {
            currentUser = allUsers[currentUserIndex].username;
          }
          
          updateStats();
          renderRanking();
        } else {
          throw new Error(data.error || 'Error desconocido del servidor');
        }
      })
      .catch(error => {
        console.error('Error cargando ranking:', error);
        showError('Error al cargar el ranking: ' + error.message);
        
        // Solo como último recurso, usar datos de ejemplo
        setTimeout(() => {
          showError('No se pudieron cargar los datos del ranking. Por favor, recarga la página.');
        }, 2000);
      });
  }

  // Mostrar mensaje de error
  function showError(message) {
    rankingContainer.innerHTML = `
      <div class="error-message">
        ${message}
      </div>
    `;
  }

  // Mostrar mensaje cuando no hay usuarios
  function showNoUsers() {
    rankingContainer.innerHTML = `
      <div class="no-users">
        <p>No hay usuarios en el ranking</p>
        <small>Los usuarios aparecerán aquí cuando comiencen a acumular puntos.</small>
      </div>
    `;
    totalUsersEl.textContent = "0";
    topPointsEl.textContent = "0";
    userPositionEl.textContent = "-";
    paginationContainer.innerHTML = '';
  }

  // Actualizar estadísticas
  function updateStats() {
    totalUsersEl.textContent = allUsers.length;
    topPointsEl.textContent = allUsers.length > 0 ? allUsers[0].points : 0;
    
    // Encontrar posición del usuario actual
    const userIndex = allUsers.findIndex(user => user.isCurrentUser);
    userPositionEl.textContent = userIndex !== -1 ? `#${userIndex + 1}` : "-";
    
    console.log(`Estadísticas actualizadas: ${allUsers.length} usuarios, top: ${allUsers[0]?.points || 0} puntos`);
  }

  // Determinar nivel del usuario
  function getUserLevel(points) {
    if (points >= 101) return 4;
    if (points >= 51) return 3;
    if (points >= 21) return 2;
    return 1;
  }

  // Obtener medallas del usuario
  function getUserBadges(user) {
    const badges = [];
    for (const badgeKey in BADGES) {
      if (BADGES[badgeKey].condition(user)) {
        badges.push(BADGES[badgeKey]);
      }
    }
    return badges;
  }

  // Renderizar ranking
  function renderRanking() {
    // Calcular paginación
    const totalPages = Math.ceil(allUsers.length / USERS_PER_PAGE);
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    const endIndex = startIndex + USERS_PER_PAGE;
    const usersToShow = allUsers.slice(startIndex, endIndex);
    
    // Renderizar tabla
    let html = `
      <table class="ranking-table">
        <thead>
          <tr>
            <th class="position">#</th>
            <th>Usuario</th>
            <th>Puntos</th>
            <th class="user-level">Nivel</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    usersToShow.forEach((user, index) => {
      const globalPosition = startIndex + index + 1;
      const level = getUserLevel(user.points);
      const badges = getUserBadges(user);
      const isCurrentUser = user.isCurrentUser;
      
      let rowClass = '';
      if (globalPosition === 1) rowClass = 'top-1';
      else if (globalPosition === 2) rowClass = 'top-2';
      else if (globalPosition === 3) rowClass = 'top-3';
      
      if (isCurrentUser) rowClass += ' current-user-highlight';
      
      html += `
        <tr class="${rowClass.trim()}">
          <td class="position">${globalPosition}</td>
          <td>
            <span class="username">${user.username}</span>
            ${badges.length > 0 ? badges.map(badge => `
              <span class="user-badge badge-${badge.id}" data-tooltip="${badge.description}">
                ${badge.name}
              </span>
            `).join('') : ''}
          </td>
          <td class="user-points">${user.points}</td>
          <td class="user-level">
            <span class="level-badge level-${level}">${LEVELS[level].name}</span>
          </td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
    `;
    
    rankingContainer.innerHTML = html;
    
    // Renderizar paginación
    renderPagination(totalPages);
    
    console.log(`Ranking renderizado: ${usersToShow.length} usuarios en página ${currentPage}`);
  }

  // Renderizar paginación
  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }
    
    let html = '';
    
    // Botón anterior
    if (currentPage > 1) {
      html += `<button class="pagination-btn" data-page="${currentPage - 1}">‹</button>`;
    }
    
    // Páginas
    for (let i = 1; i <= totalPages; i++) {
      html += `
        <button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
          ${i}
        </button>
      `;
    }
    
    // Botón siguiente
    if (currentPage < totalPages) {
      html += `<button class="pagination-btn" data-page="${currentPage + 1}">›</button>`;
    }
    
    paginationContainer.innerHTML = html;
    
    // Event listeners para paginación
    paginationContainer.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        renderRanking();
      });
    });
  }

  // Simular actualizaciones periódicas (cada 60 segundos)
  setInterval(loadRankingData, 60000);
});