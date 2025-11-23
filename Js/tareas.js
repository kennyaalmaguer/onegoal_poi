
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
  let currentSystemTasks = []; // Partidos como tareas del sistema
  let currentFilter = "all";
  let currentTaskToComplete = null;
  let availableMatches = [];
  let userGroups = [];
  let selectedMatchId = null;
  let currentAction = null;

  // Puntos fijos por tipo de tarea
  const TASK_POINTS = {
    // Individuales
    pronostico: 5, // Cambiado de 3 a 5 puntos
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

  // Función para verificar sesión antes de cargar datos
  function checkSessionAndLoad() {
    console.log('🔍 Verificando sesión...');
    fetch('php/session.php')
      .then(response => response.json())
      .then(data => {
        if (data.loggedIn) {
          console.log('✅ Usuario logueado:', data.nombre);
          // Usuario está logueado, cargar datos
          loadTasks(); // Cargar tareas normales (grupales e individuales existentes)
          loadMatchesAsTasks(); // Cargar partidos como tareas del sistema
          loadAvailableMatches();
          loadUserGroups();
        } else {
          console.log('❌ Usuario no logueado');
          // Mostrar mensaje para que se loguee
          showLoginRequiredMessage();
        }
      })
      .catch(error => {
        console.error('Error verificando sesión:', error);
        showLoginRequiredMessage();
      });
  }

  // Función para mostrar mensaje de login requerido
  function showLoginRequiredMessage() {
    tasksContainer.innerHTML = `
      <div class="no-tasks" style="text-align: center; padding: 40px; color: #ccc; grid-column: 1 / -1;">
        <h3>🔐 Inicia sesión</h3>
        <p>Debes iniciar sesión para ver y completar tareas</p>
        <a href="login.html" style="color: #00aaff; text-decoration: underline; font-weight: bold;">Ir al login</a>
      </div>
    `;
    
    // Ocultar botón de crear tarea grupal
    document.querySelector('.create-task').style.display = 'none';
  }

  // Función para mostrar mensaje cuando no hay tareas
  function showNoTasksMessage() {
    const filterMessages = {
      'all': 'No hay tareas disponibles en este momento.',
      'individual': 'No hay tareas individuales disponibles.',
      'group': 'No hay actividades grupales. Únete a un grupo para participar.'
    };
    
    tasksContainer.innerHTML = `
      <div class="no-tasks" style="text-align: center; padding: 40px; color: #ccc; grid-column: 1 / -1;">
        <h3>📝 ${filterMessages[currentFilter] || 'No hay tareas'}</h3>
        <p>${currentFilter === 'group' ? 'Crea una actividad grupal o únete a un grupo para participar.' : 'Las tareas se generan automáticamente para partidos próximos.'}</p>
      </div>
    `;
  }

  // En lugar de cargar directamente, verificar sesión primero
  checkSessionAndLoad();

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
    if (taskGroupSelect.options.length === 0 || taskGroupSelect.options[0].value === "") {
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
    currentAction = null;
  });

  confirmCompleteBtn.addEventListener("click", completeTask);

  // Cargar grupos del usuario
  function loadUserGroups() {
    fetch('php/get_user_groups.php')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          userGroups = data.groups;
          updateGroupSelect();
        } else {
          console.error('Error cargando grupos:', data.error);
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }

  function updateGroupSelect() {
    taskGroupSelect.innerHTML = "";
    
    if (userGroups.length === 0) {
      taskGroupSelect.innerHTML = '<option value="">No perteneces a ningún grupo</option>';
      return;
    }
    
    userGroups.forEach(group => {
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = group.name + (group.isAdmin ? ' (Admin)' : '');
      taskGroupSelect.appendChild(option);
    });
  }

  // Cargar partidos disponibles para actividades grupales
  function loadAvailableMatches() {
    fetch('php/get_matches.php')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          availableMatches = data.matches;
          if (taskTypeSelect.value) {
            renderMatchSelection();
          }
        } else {
          console.error('Error cargando partidos:', data.error);
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }

  // Cargar tareas normales (grupales e individuales existentes)
 function loadTasks() {
    console.log('📥 Cargando tareas normales...');
    fetch('php/get_tareas.php')
      .then(response => {
          // Primero verificar si la respuesta es OK
          if (!response.ok) {
              throw new Error('Error HTTP: ' + response.status);
          }
          return response.text(); // Primero obtener como texto
      })
      .then(text => {
          console.log('📄 Respuesta cruda:', text); // Ver qué viene realmente
          
          try {
              const data = JSON.parse(text);
              console.log('📊 Respuesta de get_tareas.php:', data);
              
              if (data.success) {
                  currentTasks = data.tasks;
                  console.log('✅ Tareas cargadas:', currentTasks.length);
                  console.log('📋 Detalle tareas:', currentTasks);
                  
                  // Filtrar para ver solo tareas grupales
                  const grupales = currentTasks.filter(task => task.scope === 'grupal');
                  console.log('👥 Tareas grupales:', grupales);
                  
                  renderTasks();
              } else {
                  console.error('❌ Error cargando tareas:', data.error);
              }
          } catch (e) {
              console.error('❌ Error parseando JSON:', e);
              console.error('📄 Texto recibido:', text);
          }
      })
      .catch(error => {
          console.error('❌ Error de red:', error);
      });
}

  // Función para cargar partidos como tareas del sistema
  function loadMatchesAsTasks() {
    console.log('📥 Cargando partidos como tareas del sistema...');
    fetch('php/get_matches.php')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Primero verificar qué partidos ya tienen pronóstico
          checkPronosticosStatus(data.matches);
        } else {
          console.error('Error cargando partidos:', data.error);
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }

  // Verificar estado de pronósticos para cada partido
  function checkPronosticosStatus(matches) {
    fetch('php/check_pronosticos_status.php')
      .then(response => response.json())
      .then(pronosticosData => {
        // Convertir partidos en "tareas" del sistema con estado actualizado
        currentSystemTasks = matches.map(match => {
          const hasPronostico = pronosticosData.some(p => p.partido_id == match.id);
          
          return {
            id: 'match-' + match.id,
            title: `Partido: ${match.teams}`,
            description: `${match.group} - ${formatDate(match.date)}`,
            type: 'partido',
            points: 5, // Ahora son 5 puntos por pronóstico
            status: hasPronostico ? 'completed' : 'pending',
            deadline: match.date,
            assignedBy: 'Sistema',
            scope: 'individual',
            partido_info: match.teams,
            matchData: match,
            isSystemTask: true,
            hasPronostico: hasPronostico // Nuevo campo para saber si ya hizo pronóstico
          };
        });
        
        console.log('✅ Partidos cargados como tareas:', currentSystemTasks.length);
        renderTasks();
      })
      .catch(error => {
        console.error('Error verificando pronósticos:', error);
        // Si hay error, cargar sin verificar estado
        currentSystemTasks = matches.map(match => ({
          id: 'match-' + match.id,
          title: `Partido: ${match.teams}`,
          description: `${match.group} - ${formatDate(match.date)}`,
          type: 'partido',
          points: 5,
          status: 'pending',
          deadline: match.date,
          assignedBy: 'Sistema',
          scope: 'individual',
          partido_info: match.teams,
          matchData: match,
          isSystemTask: true,
          hasPronostico: false
        }));
        renderTasks();
      });
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

  // Renderizar selección de partidos para actividades grupales
  function renderMatchSelection() {
    matchSelection.innerHTML = '<label>Selecciona un partido:</label>';
    selectedMatchId = null;
    
    if (availableMatches.length === 0) {
      matchSelection.innerHTML += '<p>No hay partidos disponibles</p>';
      return;
    }
    
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

  // Renderizar tareas (combinando tareas normales y partidos del sistema)
  function renderTasks() {
    tasksContainer.innerHTML = "";
    
    // Combinar tareas normales y partidos del sistema según el filtro
    let tasksToShow = [];
    
    if (currentFilter === "all") {
      tasksToShow = [...currentTasks, ...currentSystemTasks];
    } else if (currentFilter === "individual") {
      tasksToShow = currentSystemTasks;
    } else if (currentFilter === "group") {
      tasksToShow = currentTasks.filter(task => task.scope === "grupal");
    }
    
    // MOSTRAR MENSAJE CUANDO NO HAY TAREAS
    if (tasksToShow.length === 0) {
      showNoTasksMessage();
      return;
    }
    
    // Renderizar las tareas
    tasksToShow.forEach(task => {
      const taskCard = document.createElement("div");
      taskCard.classList.add("task-card");
      
      const isSystemMatch = task.isSystemTask;
      
      if (isSystemMatch) {
        const isFutureMatch = new Date(task.deadline) > new Date();
        const hasPronostico = task.hasPronostico;
        const matchStatus = hasPronostico ? 'Pronóstico Completado' : (isFutureMatch ? 'Por jugar' : 'Finalizado');
        const statusClass = hasPronostico ? "status-completed" : (isFutureMatch ? "status-pending" : "status-completed");
        
        taskCard.innerHTML = `
          <div class="task-header">
            <div class="task-title">
              ${task.title}
              <span class="system-task-badge">PARTIDO</span>
            </div>
            <div class="task-points">+5 pts</div>
          </div>
          
          <div class="task-description">
            ${task.description}
          </div>
          
          <div class="task-details">
            <div class="task-detail">
              <span class="task-detail-label">Etapa:</span>
              <span>${task.matchData.group}</span>
            </div>
            <div class="task-detail">
              <span class="task-detail-label">Fecha:</span>
              <span>${formatDate(task.deadline)}</span>
            </div>
            <div class="task-detail">
              <span class="task-detail-label">Estado:</span>
              <span>${matchStatus}</span>
            </div>
          </div>
          
          <div class="task-status ${statusClass}">${matchStatus}</div>
          
          <div class="task-actions">
            ${!hasPronostico && isFutureMatch ? `
              <button class="complete-btn" data-action="pronostico" data-match-id="${task.id.replace('match-', '')}">
                📊 Hacer Pronóstico (+5 pts)
              </button>
            ` : hasPronostico ? `
              <button class="complete-btn completed" disabled>
                ✅ Pronóstico Completado
              </button>
            ` : `
              <button class="complete-btn" data-task-id="${task.id}" data-action="resumen">
                📝 Escribir Resumen
              </button>
              <button class="complete-btn" data-task-id="${task.id}" data-action="jugador">
                ⭐ Jugador Clave
              </button>
            `}
          </div>
        `;
      } else {
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
            ${task.scope === "grupal" && task.grupo_nombre ? `
            <div class="task-detail">
              <span class="task-detail-label">Grupo:</span>
              <span>${task.grupo_nombre}</span>
            </div>
            ` : ""}
            ${task.partido_info ? `
            <div class="task-detail">
              <span class="task-detail-label">Partido:</span>
              <span>${task.partido_info}</span>
            </div>
            ` : ""}
          </div>
          
          <div class="task-status ${statusClass}">${statusText}</div>
          
          ${task.status === "pending" ? 
            `<div class="task-actions">
              <button class="complete-btn" data-task-id="${task.id}" data-task-type="${task.type}">
                ${isSystemTask ? 'Completar' : 'Participar'}
              </button>
            </div>` : 
            ''
          }
        `;
      }
      
      tasksContainer.appendChild(taskCard);
    });
    
    // Agregar event listeners a los botones de completar
    document.querySelectorAll(".complete-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const action = e.target.dataset.action;
        const taskId = e.target.dataset.taskId;
        const taskType = e.target.dataset.taskType;
        const matchId = e.target.dataset.matchId;
        
        // REDIRECCIÓN PARA PRONÓSTICOS
        if (action === 'pronostico' && matchId) {
          window.location.href = `pronosticos.html?match=${matchId}`;
          return;
        }
        
        if (taskId && taskId.startsWith('match-')) {
          openCompleteTaskModal(taskId, action);
        } else if (taskId) {
          openCompleteTaskModal(parseInt(taskId), taskType);
        }
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
      "prediccion": "Predicción Loca",
      "partido": "Partido"
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

  // Abrir modal para completar/participar
  function openCompleteTaskModal(taskId, actionOrType) {
    if (typeof taskId === 'string' && taskId.startsWith('match-')) {
      const matchId = taskId.replace('match-', '');
      currentTaskToComplete = currentSystemTasks.find(task => task.id === taskId);
      currentAction = actionOrType;
      
      if (!currentTaskToComplete) return;
      
      const actions = {
        'resumen': {
          title: 'Escribir Resumen', 
          instructions: `Redacta un resumen analítico del partido ${currentTaskToComplete.partido_info}`,
          type: 'resumen',
          points: TASK_POINTS.resumen
        },
        'jugador': {
          title: 'Jugador Clave',
          instructions: `Identifica al jugador clave del partido ${currentTaskToComplete.partido_info} y justifica tu elección`,
          type: 'jugador',
          points: TASK_POINTS.jugador
        }
      };
      
      const currentActionConfig = actions[actionOrType];
      
      document.getElementById("completeTaskTitle").textContent = currentActionConfig.title;
      document.getElementById("taskInstructions").textContent = currentActionConfig.instructions;
      
      document.querySelector(".task-points-info").textContent = `+${currentActionConfig.points} puntos`;
      
      setupTaskInterface(currentActionConfig.type, true);
      
    } else {
      currentTaskToComplete = currentTasks.find(task => task.id === taskId);
      currentAction = null;
      
      if (!currentTaskToComplete) return;
      
      const isSystemTask = currentTaskToComplete.assignedBy === "Sistema";
      document.getElementById("completeTaskTitle").textContent = 
        isSystemTask ? `Completar Tarea` : `Participar en Actividad`;
      
      document.getElementById("taskInstructions").textContent = currentTaskToComplete.description;
      
      setupTaskInterface(actionOrType, false);
    }
    
    completeTaskModal.style.display = "flex";
  }

  // Configurar interfaz según tipo de tarea
  function setupTaskInterface(taskType, isSystemMatch = false) {
    writingTaskContent.classList.add('hidden');
    triviaOptions.classList.add('hidden');
    encuestaOptions.classList.add('hidden');
    
    if (isSystemMatch) {
      if (['resumen', 'jugador'].includes(taskType)) {
        writingTaskContent.classList.remove('hidden');
        document.getElementById("taskResponse").value = "";
        document.getElementById("taskResponse").placeholder = getWritingPlaceholder(taskType);
      }
    } else {
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
  }

  // Placeholder para tareas de escritura
  function getWritingPlaceholder(taskType) {
    const placeholders = {
      pronostico: "Ej: 2-1 a favor del equipo local...",
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
    
    const isSystemMatch = currentTaskToComplete.isSystemTask;
    
    if (isSystemMatch && currentAction) {
      const response = document.getElementById("taskResponse").value.trim();
      if (!response) {
        alert("Por favor, escribe tu respuesta antes de enviar.");
        return;
      }
      
      const completeData = {
        taskId: currentTaskToComplete.id.replace('match-', ''),
        taskType: currentAction,
        response: response,
        partidoInfo: currentTaskToComplete.partido_info,
        isSystemMatch: true
      };
      
      fetch('php/complete_partido_task.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(completeData)
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert(`¡Respuesta enviada! +${data.points} puntos`);
          completeTaskModal.style.display = "none";
          currentAction = null;
          loadMatchesAsTasks();
        } else {
          alert('Error: ' + data.error);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Error al enviar la respuesta');
      });
      
    } else {
      if (currentTaskToComplete.type === "pronostico") {
        window.location.href = "pronosticos.html";
        return;
      }
      
      let responseData = null;
      
      if (['debate', 'resumen', 'jugador', 'analisis', 'meme', 'prediccion'].includes(currentTaskToComplete.type)) {
        const response = document.getElementById("taskResponse").value.trim();
        if (!response) {
          alert("Por favor, escribe tu respuesta antes de participar.");
          return;
        }
        responseData = response;
      }
      else if (currentTaskToComplete.type === "trivia") {
        const selected = document.querySelector("#triviaButtons button.active");
        if (!selected) {
          alert("Por favor, selecciona una opción para la trivia.");
          return;
        }
        responseData = selected.textContent;
      }
      else if (currentTaskToComplete.type === "encuesta") {
        const selected = document.querySelector("#encuestaButtons button.active");
        if (!selected) {
          alert("Por favor, vota por una opción en la encuesta.");
          return;
        }
        responseData = selected.textContent;
      }
      
      const completeData = {
        taskId: currentTaskToComplete.id,
        taskType: currentTaskToComplete.type,
        response: responseData
      };
      
      fetch('php/complete_tarea.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(completeData)
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          const message = currentTaskToComplete.assignedBy === "Sistema" 
            ? `¡Tarea completada! +${data.points} puntos` 
            : `¡Participación registrada! +${data.points} puntos`;
          
          alert(message);
          completeTaskModal.style.display = "none";
          loadTasks();
        } else {
          alert('Error: ' + data.error);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Error al completar la tarea');
      });
    }
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
    
    const taskData = {
      groupId: groupId,
      matchId: selectedMatchId,
      type: taskType,
      description: document.getElementById("taskDescription").value,
      deadline: document.getElementById("taskDeadline").value
    };
    
    fetch('php/create_tarea.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData)
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        createTaskModal.style.display = "none";
        resetCreateModal();
        loadTasks();
        alert(`✅ Actividad grupal creada exitosamente`);
      } else {
        alert('Error: ' + data.error);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Error al crear la actividad');
    });
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
