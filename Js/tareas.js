
    document.addEventListener("DOMContentLoaded", () => {
      // Elementos del DOM
      const tasksContainer = document.getElementById("tasksContainer");
      const createTaskBtn = document.getElementById("createTaskBtn");
      const createTaskModal = document.getElementById("createTaskModal");
      const cancelTaskBtn = document.getElementById("cancelTaskBtn");
      const confirmTaskBtn = document.getElementById("confirmTaskBtn");
      const completeTaskModal = document.getElementById("completeTaskModal");
      const cancelCompleteBtn = document.getElementById("cancelCompleteBtn");
      const confirmCompleteBtn = document.getElementById("confirmCompleteBtn");
      const filterBtns = document.querySelectorAll(".filter-btn");
      const taskGroupSelect = document.getElementById("taskGroup");
      const taskTypeSelect = document.getElementById("taskType");
      const matchSelection = document.getElementById("matchSelection");
      const pointsInfo = document.getElementById("pointsInfo");
      const writingTaskContent = document.getElementById("writingTaskContent");
      const triviaOptions = document.getElementById("triviaOptions");
      const encuestaOptions = document.getElementById("encuestaOptions");
      
      // Variables de estado
      let currentTasks = [];
      let currentFilter = "all";
      let currentTaskToComplete = null;
      let availableMatches = [];
      let selectedMatchId = null;

      // Puntos fijos por tipo de tarea
      const TASK_POINTS = {
        // Individuales
        pronostico: 5,
        resumen: 3,
        jugador: 2,
        // Grupales
        debate: 3,
        trivia: 3,
        encuesta: 2,
        analisis: 4,
        meme: 2,
        prediccion: 3
      };

      // Cargar datos iniciales
      loadTasks();
      loadAvailableMatches();
      loadUserGroups();

      // Event listeners para filtros
      filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          filterBtns.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          currentFilter = btn.dataset.filter;
          renderTasks();
        });
      });

      // Cambio en tipo de tarea grupal
      taskTypeSelect.addEventListener("change", updateTaskType);

      // Modal para crear tarea GRUPAL
      createTaskBtn.addEventListener("click", () => {
        if (taskGroupSelect.options.length === 0) {
          alert("No tienes grupos disponibles para crear actividades. Únete a un grupo primero.");
          return;
        }
        createTaskModal.style.display = "flex";
        updateTaskType();
      });

      cancelTaskBtn.addEventListener("click", () => {
        createTaskModal.style.display = "none";
        resetCreateModal();
      });

      confirmTaskBtn.addEventListener("click", createGroupTask);

      // Modal para completar tarea
      cancelCompleteBtn.addEventListener("click", () => {
        completeTaskModal.style.display = "none";
      });

      confirmCompleteBtn.addEventListener("click", completeTask);

      // Cargar grupos del usuario donde es admin
      function loadUserGroups() {
        const groups = [
          { id: 1, name: "Amigos del Mundial", isAdmin: true },
          { id: 2, name: "Familia", isAdmin: false },
          { id: 3, name: "Compañeros de Trabajo", isAdmin: true }
        ];
        
        taskGroupSelect.innerHTML = "";
        const adminGroups = groups.filter(group => group.isAdmin);
        
        if (adminGroups.length === 0) {
          taskGroupSelect.innerHTML = '<option value="">No eres admin de ningún grupo</option>';
          return;
        }
        
        adminGroups.forEach(group => {
          const option = document.createElement("option");
          option.value = group.id;
          option.textContent = group.name;
          taskGroupSelect.appendChild(option);
        });
      }

      // Cargar partidos disponibles
      function loadAvailableMatches() {
        availableMatches = [
          { id: 1, teams: "Argentina vs Brasil", date: "2026-06-14T15:55:00", group: "Fase de Grupos" },
          { id: 2, teams: "España vs Alemania", date: "2026-06-15T18:30:00", group: "Fase de Grupos" },
          { id: 3, teams: "México vs Estados Unidos", date: "2026-06-16T20:00:00", group: "Fase de Grupos" },
          { id: 4, teams: "Francia vs Inglaterra", date: "2026-06-17T16:45:00", group: "Octavos de Final" },
          { id: 5, teams: "Portugal vs Países Bajos", date: "2026-06-18T19:15:00", group: "Octavos de Final" }
        ];
      }

      // Actualizar interfaz según tipo de tarea seleccionado
      function updateTaskType() {
        const taskType = taskTypeSelect.value;
        const points = TASK_POINTS[taskType];
        
        pointsInfo.innerHTML = `Esta actividad otorgará <strong>${points} puntos</strong> a cada participante`;
        renderMatchSelection();
        
        // Auto-completar descripción según tipo
        if (selectedMatchId) {
          autoFillDescription(taskType);
        }
      }

      // Renderizar selección de partidos
      function renderMatchSelection() {
        matchSelection.innerHTML = '<label>Selecciona un partido:</label>';
        selectedMatchId = null;
        
        availableMatches.forEach(match => {
          const matchOption = document.createElement("div");
          matchOption.className = "match-option";
          matchOption.dataset.matchId = match.id;
          matchOption.innerHTML = `
            <strong>${match.teams}</strong><br>
            <small>${formatDate(match.date)} - ${match.group}</small>
          `;
          
          matchOption.addEventListener("click", () => {
            document.querySelectorAll(".match-option").forEach(opt => {
              opt.classList.remove("selected");
            });
            matchOption.classList.add("selected");
            selectedMatchId = match.id;
            autoFillDescription(taskTypeSelect.value);
          });
          
          matchSelection.appendChild(matchOption);
        });
      }

      // Auto-completar descripción según tipo de actividad
      function autoFillDescription(taskType) {
        if (!selectedMatchId) return;
        
        const selectedMatch = availableMatches.find(m => m.id === selectedMatchId);
        const descriptions = {
          debate: `¿Quién crees que ganará ${selectedMatch.teams} y por qué? Debate con tu grupo.`,
          trivia: `TRIVIA: ¿En qué minuto se marcará el primer gol en ${selectedMatch.teams}?`,
          encuesta: `ENCUESTA: Vota por el MVP potencial de ${selectedMatch.teams}`,
          analisis: `ANÁLISIS: ¿Qué estrategia usarías para ganar ${selectedMatch.teams}?`,
          meme: `MEME: Crea el mejor meme sobre ${selectedMatch.teams}`,
          prediccion: `PREDICCIÓN LOCA: ¿Habrá tarjeta roja en ${selectedMatch.teams}? ¿Cuántos corners?`
        };
        
        document.getElementById("taskDescription").value = descriptions[taskType] || "";
      }

      // Cargar tareas
      function loadTasks() {
        // Tareas individuales del sistema
        const individualTasks = [
          {
            id: 1,
            title: "Pronóstico Argentina vs Brasil",
            description: "Realiza tu pronóstico del marcador exacto y el primer goleador.",
            type: "pronostico",
            scope: "individual",
            points: 5,
            deadline: "2026-06-14T15:55:00",
            assignedBy: "Sistema",
            status: "pending",
            matchId: 1,
            isDaily: true
          },
          {
            id: 2,
            title: "Resumen España vs Alemania",
            description: "Redacta un resumen analítico del partido.",
            type: "resumen",
            scope: "individual",
            points: 3,
            deadline: "2026-06-15T23:59:00",
            assignedBy: "Sistema",
            status: "pending",
            matchId: 2,
            isDaily: true
          },
          {
            id: 3,
            title: "Jugador Clave México vs USA",
            description: "Identifica al jugador clave y justifica tu elección.",
            type: "jugador",
            scope: "individual",
            points: 2,
            deadline: "2026-06-16T18:00:00",
            assignedBy: "Sistema",
            status: "completed",
            matchId: 3,
            isDaily: true
          }
        ];

        // Tareas grupales de ejemplo
        const groupTasks = [
          {
            id: 4,
            title: "Debate: Argentina vs Brasil",
            description: "¿Quién crees que ganará Argentina vs Brasil y por qué? Debate con tu grupo.",
            type: "debate",
            scope: "group",
            points: 3,
            deadline: "2026-06-14T14:00:00",
            assignedBy: "CarlosR",
            status: "pending",
            groupId: 1,
            matchId: 1,
            isDaily: false
          },
          {
            id: 5,
            title: "Trivia: Primer Gol",
            description: "TRIVIA: ¿En qué minuto se marcará el primer gol en España vs Alemania?",
            type: "trivia",
            scope: "group",
            points: 3,
            deadline: "2026-06-15T17:00:00",
            assignedBy: "MariaG",
            status: "pending",
            groupId: 3,
            matchId: 2,
            isDaily: false
          }
        ];

        currentTasks = [...individualTasks, ...groupTasks];
        renderTasks();
      }

      // Renderizar tareas
      function renderTasks() {
        tasksContainer.innerHTML = "";
        
        const filteredTasks = currentTasks.filter(task => {
          if (currentFilter === "all") return true;
          return task.scope === currentFilter;
        });
        
        if (filteredTasks.length === 0) {
          tasksContainer.innerHTML = `<p>No hay tareas ${currentFilter === 'all' ? '' : currentFilter} que mostrar.</p>`;
          return;
        }
        
        filteredTasks.forEach(task => {
          const taskCard = document.createElement("div");
          taskCard.classList.add("task-card");
          
          const statusClass = task.status === "completed" ? "status-completed" : "status-pending";
          const statusText = task.status === "completed" ? "Completada" : "Pendiente";
          const isSystemTask = task.assignedBy === "Sistema";
          
          taskCard.innerHTML = `
            <div class="task-header">
              <div class="task-title">
                ${task.title}
                ${isSystemTask ? 
                  '<span class="system-task-badge">INDIVIDUAL</span>' : 
                  '<span class="group-task-badge">GRUPAL</span>'
                }
              </div>
              <div class="task-points">+${task.points} puntos</div>
            </div>
            
            <div class="task-description">
              ${task.description}
            </div>
            
            <div class="task-details">
              <div class="task-detail">
                <span class="task-detail-label">Tipo:</span>
                <span>${getTaskTypeText(task.type)}</span>
              </div>
              <div class="task-detail">
                <span class="task-detail-label">Fecha límite:</span>
                <span>${formatDate(task.deadline)}</span>
              </div>
              <div class="task-detail">
                <span class="task-detail-label">${isSystemTask ? 'Sistema' : 'Creada por'}:</span>
                <span>${task.assignedBy}</span>
              </div>
              ${task.scope === "group" ? `
              <div class="task-detail">
                <span class="task-detail-label">Grupo:</span>
                <span>${getGroupName(task.groupId)}</span>
              </div>
              ` : ""}
            </div>
            
            <div class="task-status ${statusClass}">${statusText}</div>
            
            ${task.status === "pending" ? 
              `<div class="task-actions">
                <button class="complete-btn" data-task-id="${task.id}">
                  ${isSystemTask ? 'Completar' : 'Participar'}
                </button>
              </div>` : 
              ''
            }
          `;
          
          tasksContainer.appendChild(taskCard);
        });
        
        // Agregar event listeners
        document.querySelectorAll(".complete-btn").forEach(btn => {
          btn.addEventListener("click", (e) => {
            const taskId = parseInt(e.target.dataset.taskId);
            openCompleteTaskModal(taskId);
          });
        });
      }

      // Obtener texto del tipo de tarea
      function getTaskTypeText(type) {
        const types = {
          "pronostico": "Pronóstico",
          "resumen": "Resumen",
          "jugador": "Jugador Clave",
          "debate": "Debate",
          "trivia": "Trivia",
          "encuesta": "Encuesta",
          "analisis": "Análisis Táctico",
          "meme": "Meme",
          "prediccion": "Predicción Loca"
        };
        return types[type] || "Actividad";
      }

      // Formatear fecha
      function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      }

      // Obtener nombre del grupo
      function getGroupName(groupId) {
        const groups = {
          1: "Amigos del Mundial",
          2: "Familia",
          3: "Compañeros de Trabajo"
        };
        return groups[groupId] || "Grupo desconocido";
      }

      // Abrir modal para completar/participar
      function openCompleteTaskModal(taskId) {
        currentTaskToComplete = currentTasks.find(task => task.id === taskId);
        
        if (!currentTaskToComplete) return;
        
        const isSystemTask = currentTaskToComplete.assignedBy === "Sistema";
        document.getElementById("completeTaskTitle").textContent = 
          isSystemTask ? `Completar Tarea` : `Participar en Actividad`;
        
        document.getElementById("taskInstructions").textContent = currentTaskToComplete.description;
        
        // Configurar interfaz según tipo de tarea
        setupTaskInterface(currentTaskToComplete.type);
        
        completeTaskModal.style.display = "flex";
      }

      // Configurar interfaz según tipo de tarea
      function setupTaskInterface(taskType) {
        // Ocultar todos los paneles primero
        writingTaskContent.classList.add('hidden');
        triviaOptions.classList.add('hidden');
        encuestaOptions.classList.add('hidden');
        
        if (taskType === 'pronostico') {
          writingTaskContent.classList.add('hidden');
          document.getElementById("taskInstructions").innerHTML += 
            '<p class="task-note">Serás redirigido a la página de pronósticos.</p>';
        } 
        else if (['debate', 'resumen', 'jugador', 'analisis', 'meme', 'prediccion'].includes(taskType)) {
          writingTaskContent.classList.remove('hidden');
          document.getElementById("taskResponse").value = "";
          document.getElementById("taskResponse").placeholder = getWritingPlaceholder(taskType);
        }
        else if (taskType === 'trivia') {
          triviaOptions.classList.remove('hidden');
          setupTriviaOptions();
        }
        else if (taskType === 'encuesta') {
          encuestaOptions.classList.remove('hidden');
          setupEncuestaOptions();
        }
      }

      // Placeholder para tareas de escritura
      function getWritingPlaceholder(taskType) {
        const placeholders = {
          debate: "Escribe tu opinión para el debate...",
          resumen: "Redacta tu resumen del partido...",
          jugador: "Explica por qué elegiste este jugador...",
          analisis: "Describe tu análisis táctico...",
          meme: "Describe tu idea de meme o sube un enlace...",
          prediccion: "Comparte tu predicción más loca..."
        };
        return placeholders[taskType] || "Escribe tu respuesta...";
      }

      // Configurar opciones de trivia
      function setupTriviaOptions() {
        const options = ['Minuto 1-15', 'Minuto 16-30', 'Minuto 31-45', 'Minuto 46-60', 'Minuto 61-75', 'Minuto 76-90', 'No habrá gol'];
        const triviaButtons = document.getElementById("triviaButtons");
        triviaButtons.innerHTML = "";
        
        options.forEach(option => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "filter-btn";
          button.textContent = option;
          button.style.margin = "5px";
          button.addEventListener("click", () => {
            document.querySelectorAll("#triviaButtons button").forEach(btn => {
              btn.classList.remove("active");
            });
            button.classList.add("active");
          });
          triviaButtons.appendChild(button);
        });
      }

      // Configurar opciones de encuesta
      function setupEncuestaOptions() {
        const teams = currentTaskToComplete.description.includes(" vs ") ? 
          currentTaskToComplete.description.split(" vs ")[0].split(" ").pop() + " vs " + 
          currentTaskToComplete.description.split(" vs ")[1].split(" ")[0] : 
          "Equipo A vs Equipo B";
        
        const options = [
          `Jugador de ${teams.split(" vs ")[0]}`,
          `Jugador de ${teams.split(" vs ")[1]}`,
          'Portero destacado',
          'Árbitro (si aplica)'
        ];
        
        const encuestaButtons = document.getElementById("encuestaButtons");
        encuestaButtons.innerHTML = "";
        
        options.forEach(option => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "filter-btn";
          button.textContent = option;
          button.style.margin = "5px";
          button.addEventListener("click", () => {
            document.querySelectorAll("#encuestaButtons button").forEach(btn => {
              btn.classList.remove("active");
            });
            button.classList.add("active");
          });
          encuestaButtons.appendChild(button);
        });
      }

      // Completar tarea
      function completeTask() {
        if (!currentTaskToComplete) return;
        
        if (currentTaskToComplete.type === "pronostico") {
          window.location.href = "pronosticos.html";
          return;
        }
        
        // Validar según tipo de tarea
        if (['debate', 'resumen', 'jugador', 'analisis', 'meme', 'prediccion'].includes(currentTaskToComplete.type)) {
          const response = document.getElementById("taskResponse").value.trim();
          if (!response) {
            alert("Por favor, escribe tu respuesta antes de participar.");
            return;
          }
        }
        else if (currentTaskToComplete.type === "trivia") {
          const selected = document.querySelector("#triviaButtons button.active");
          if (!selected) {
            alert("Por favor, selecciona una opción para la trivia.");
            return;
          }
        }
        else if (currentTaskToComplete.type === "encuesta") {
          const selected = document.querySelector("#encuestaButtons button.active");
          if (!selected) {
            alert("Por favor, vota por una opción en la encuesta.");
            return;
          }
        }
        
        // Completar tarea
        currentTaskToComplete.status = "completed";
        
        const message = currentTaskToComplete.assignedBy === "Sistema" 
          ? `¡Tarea completada! +${currentTaskToComplete.points} puntos` 
          : `¡Participación registrada! +${currentTaskToComplete.points} puntos`;
        
        alert(message);
        completeTaskModal.style.display = "none";
        renderTasks();
      }

      // Crear nueva tarea GRUPAL
      function createGroupTask() {
        const taskType = taskTypeSelect.value;
        
        if (!selectedMatchId) {
          alert("Por favor, selecciona un partido.");
          return;
        }
        
        if (!document.getElementById("taskDescription").value.trim()) {
          alert("Por favor, escribe la pregunta o consigna.");
          return;
        }
        
        if (!document.getElementById("taskDeadline").value) {
          alert("Es necesario establecer una fecha límite.");
          return;
        }
        
        const selectedMatch = availableMatches.find(m => m.id === selectedMatchId);
        const points = TASK_POINTS[taskType];
        const groupId = parseInt(taskGroupSelect.value);
        
        // Generar título automáticamente
        const typeText = getTaskTypeText(taskType);
        const title = `${typeText}: ${selectedMatch.teams}`;
        
        // Crear nueva tarea grupal
        const newTask = {
          id: Date.now(),
          title,
          description: document.getElementById("taskDescription").value,
          type: taskType,
          scope: "group",
          points: points,
          deadline: document.getElementById("taskDeadline").value,
          assignedBy: "Tú",
          status: "pending",
          groupId: groupId,
          matchId: selectedMatchId,
          isDaily: false
        };
        
        currentTasks.push(newTask);
        
        // Cerrar modal y actualizar
        createTaskModal.style.display = "none";
        resetCreateModal();
        renderTasks();
        
        alert(`✅ Actividad grupal creada exitosamente en ${getGroupName(groupId)}`);
      }

      // Reiniciar modal de creación
      function resetCreateModal() {
        document.getElementById("taskDescription").value = "";
        document.getElementById("taskDeadline").value = "";
        selectedMatchId = null;
        document.querySelectorAll(".match-option").forEach(opt => {
          opt.classList.remove("selected");
        });
      }
    });
