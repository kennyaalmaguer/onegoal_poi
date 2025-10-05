
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
      let currentUser = "TuUsuario"; // Esto vendría de la sesión del usuario
      
      // Definición de niveles
      const LEVELS = {
        1: { name: "Aficionado", min: 0, max: 20 },
        2: { name: "Fanático", min: 21, max: 50 },
        3: { name: "Analista", min: 51, max: 100 },
        4: { name: "Leyenda", min: 101, max: Infinity }
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

      loadRankingData();

      // Cargar datos del ranking
      function loadRankingData() {
        rankingContainer.innerHTML = '<div class="loading">Cargando ranking...</div>';
        
        // En producción, esto se conectaría a un endpoint PHP
        // fetch('php/get_ranking.php')
        //   .then(response => response.json())
        //   .then(data => {
        //     allUsers = data.users;
        //     currentUser = data.currentUser;
        //     updateStats();
        //     renderRanking();
        //   })
        //   .catch(error => {
        //     rankingContainer.innerHTML = '<div class="error-message">Error cargando el ranking</div>';
        //   });
        
        // Por ahora usamos datos de ejemplo
        setTimeout(() => {
          allUsers = generateSampleUsers();
          updateStats();
          renderRanking();
        }, 1000);
      }

      // Generar usuarios de ejemplo
      function generateSampleUsers() {
        const users = [
          // Usuario actual (debería identificarse automáticamente)
          {
            id: 10,
            username: "TuUsuario",
            points: 45,
            exactPredictions: 3,
            quickPredictions: 8,
            completedTasks: 12,
            chatMessages: 55,
            isCurrentUser: true
          },
          // Otros usuarios
          {
            id: 1,
            username: "MessiFan10",
            points: 125,
            exactPredictions: 5,
            quickPredictions: 15,
            completedTasks: 20,
            chatMessages: 80
          },
          {
            id: 2,
            username: "ProPredictor", 
            points: 112,
            exactPredictions: 4,
            quickPredictions: 12,
            completedTasks: 8,
            chatMessages: 60
          },
          {
            id: 3,
            username: "FootballExpert",
            points: 98,
            exactPredictions: 3,
            quickPredictions: 6,
            completedTasks: 15,
            chatMessages: 45
          },
          {
            id: 4,
            username: "WorldCup2026",
            points: 87,
            exactPredictions: 2,
            quickPredictions: 10,
            completedTasks: 18,
            chatMessages: 52
          },
          {
            id: 5,
            username: "GoalMaster",
            points: 76,
            exactPredictions: 4,
            quickPredictions: 9,
            completedTasks: 5,
            chatMessages: 20
          },
          {
            id: 6,
            username: "PredictionKing",
            points: 68,
            exactPredictions: 3,
            quickPredictions: 4,
            completedTasks: 7,
            chatMessages: 55
          },
          {
            id: 7,
            username: "FootballLover",
            points: 62,
            exactPredictions: 1,
            quickPredictions: 3,
            completedTasks: 14,
            chatMessages: 48
          },
          {
            id: 8,
            username: "ScorePredictor",
            points: 57,
            exactPredictions: 2,
            quickPredictions: 11,
            completedTasks: 13,
            chatMessages: 25
          },
          {
            id: 9,
            username: "Mundial2026Fan",
            points: 49,
            exactPredictions: 1,
            quickPredictions: 2,
            completedTasks: 6,
            chatMessages: 65
          },
          {
            id: 11,
            username: "MasterPredictor",
            points: 42,
            exactPredictions: 3,
            quickPredictions: 7,
            completedTasks: 16,
            chatMessages: 70
          },
          {
            id: 12,
            username: "QuickPredict",
            points: 38,
            exactPredictions: 0,
            quickPredictions: 8,
            completedTasks: 3,
            chatMessages: 10
          },
          {
            id: 13,
            username: "SilentPredictor",
            points: 35,
            exactPredictions: 2,
            quickPredictions: 1,
            completedTasks: 4,
            chatMessages: 5
          },
          {
            id: 14,
            username: "TaskMaster",
            points: 32,
            exactPredictions: 0,
            quickPredictions: 2,
            completedTasks: 11,
            chatMessages: 15
          },
          {
            id: 15,
            username: "ChatterBox",
            points: 28,
            exactPredictions: 1,
            quickPredictions: 1,
            completedTasks: 2,
            chatMessages: 85
          }
        ];

        // Ordenar por puntos (descendente)
        return users.sort((a, b) => b.points - a.points);
      }

      // Actualizar estadísticas
      function updateStats() {
        totalUsersEl.textContent = allUsers.length;
        topPointsEl.textContent = allUsers.length > 0 ? allUsers[0].points : 0;
        
        // Encontrar posición del usuario actual
        const userIndex = allUsers.findIndex(user => user.isCurrentUser);
        userPositionEl.textContent = userIndex !== -1 ? `#${userIndex + 1}` : "-";
      }

      // Determinar nivel del usuario
      function getUserLevel(points) {
        for (let level = 4; level >= 1; level--) {
          if (points >= LEVELS[level].min) {
            return level;
          }
        }
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
            <tr class="${rowClass}">
              <td class="position">${globalPosition}</td>
              <td>
                ${user.username}
                ${badges.map(badge => `
                  <span class="user-badge badge-${badge.id}" data-tooltip="${badge.description}">
                    ${badge.name}
                  </span>
                `).join('')}
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
      }

      // Renderizar paginación
      function renderPagination(totalPages) {
        if (totalPages <= 1) {
          paginationContainer.innerHTML = '';
          return;
        }
        
        let html = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Ajustar si estamos cerca del final
        if (endPage - startPage + 1 < maxVisiblePages) {
          startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // Botón anterior
        if (currentPage > 1) {
          html += `<button class="pagination-btn" data-page="${currentPage - 1}">‹</button>`;
        }
        
        // Páginas
        for (let i = startPage; i <= endPage; i++) {
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

      // Simular actualizaciones periódicas (cada 30 segundos)
      setInterval(loadRankingData, 30000);
    });
