const openModalBtn = document.getElementById("openModalBtn");
const modal = document.getElementById("createModal");
const cancelBtn = document.getElementById("cancelBtn");
const createBtn = document.getElementById("createBtn");
const tournamentsContainer = document.getElementById("tournaments-container");

// Tu nombre de usuario (cambia esto por tu usuario real)
const myUsername = "TuUsuario"; // Puedes cambiar esto o obtenerlo de una variable global/sesión

// Abrir modal
openModalBtn.addEventListener("click", () => {
  modal.style.display = "flex";
});

// Cerrar modal
cancelBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

// Validar checkboxes en tiempo real
document.getElementById('maxParticipants').addEventListener('change', updateCheckboxLimits);
document.querySelectorAll('#participantsList input[type="checkbox"]').forEach(checkbox => {
  checkbox.addEventListener('change', updateCheckboxLimits);
});

function updateCheckboxLimits() {
  const maxParticipants = parseInt(document.getElementById("maxParticipants").value);
  const selected = [...document.querySelectorAll("#participantsList input:checked")];
  const checkboxes = document.querySelectorAll('#participantsList input[type="checkbox"]');
  
  // Si se alcanzó el límite (restando 1 por el creador), deshabilitar los checkboxes no seleccionados
  if (selected.length >= maxParticipants - 1) {
    checkboxes.forEach(checkbox => {
      if (!checkbox.checked) {
        checkbox.disabled = true;
        checkbox.parentElement.style.opacity = '0.6';
      }
    });
  } else {
    // Habilitar todos los checkboxes
    checkboxes.forEach(checkbox => {
      checkbox.disabled = false;
      checkbox.parentElement.style.opacity = '1';
    });
  }
  
  // Actualizar contador (incluyéndote a ti)
  const counter = document.getElementById('selectedCounter');
  if (counter) {
    counter.textContent = `${selected.length + 1}/${maxParticipants} seleccionados (incluyéndote)`;
  }
}

// Crear grupo
createBtn.addEventListener("click", () => {
  const name = document.getElementById("groupName").value;
  const maxParticipants = parseInt(document.getElementById("maxParticipants").value);
  const selected = [...document.querySelectorAll("#participantsList input:checked")].map(cb => cb.value);

  if (!name) {
    alert("Por favor ingresa un nombre para el grupo");
    return;
  }

  // Agregarte automáticamente como participante
  const allParticipants = [myUsername, ...selected];
  
  if (allParticipants.length > maxParticipants) {
    alert(`No puedes exceder el límite de ${maxParticipants} participantes. Tú ya estás incluido automáticamente.`);
    return;
  }

  const card = document.createElement("div");
  card.classList.add("tournament-card");
  card.innerHTML = `
    <div class="tournament-header">
      <div class="tournament-name">${name}</div>
      <div class="tournament-creator">Creado por: ${myUsername}</div>
    </div>
    <div class="tournament-details">
      <div class="tournament-detail"><span>Participantes:</span><span>${allParticipants.length}/${maxParticipants}</span></div>
      <div class="tournament-detail"><span>Puntos:</span><span>0</span></div>
      <div class="tournament-detail"><span>Estado:</span><span>${allParticipants.length >= maxParticipants ? 'Lleno' : 'Activo'}</span></div>
    </div>
    <div class="participants">
      <div class="participants-title">Participantes:</div>
      <div class="participants-list">
        ${allParticipants.map(p => `<span class="participant">${p}</span>`).join("")}
      </div>
    </div>
    <div class="tournament-actions">
      <button class="view-btn">Ver Detalles</button>
      <button class="join-btn" ${allParticipants.length >= maxParticipants ? 'disabled' : ''}>${allParticipants.length >= maxParticipants ? 'Lleno' : 'Agregar Participante'}</button>
    </div>
  `;
  
  // Agregar funcionalidad al botón "Agregar Participante"
  const joinBtn = card.querySelector('.join-btn');
  if (!joinBtn.disabled) {
    joinBtn.addEventListener('click', function() {
      openAddParticipantModal(card, allParticipants, maxParticipants);
    });
  }

  tournamentsContainer.appendChild(card);
  modal.style.display = "none";
  resetModal();
});

// Función para abrir modal de agregar participante
function openAddParticipantModal(card, currentParticipants, maxParticipants) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Agregar Participante</h3>
      <div class="selected-counter" id="addParticipantCounter">${currentParticipants.length}/${maxParticipants} participantes (incluyéndote)</div>
      
      <label>Selecciona participantes para agregar:</label>
      <div class="checkbox-list" id="addParticipantsList">
        ${getAvailableParticipants(currentParticipants).map(participant => `
          <label><input type="checkbox" value="${participant}"> ${participant}</label>
        `).join('')}
      </div>

      <div class="modal-actions">
        <button class="cancel-btn" id="cancelAddBtn">Cancelar</button>
        <button class="join-btn" id="confirmAddBtn">Agregar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const cancelBtn = modal.querySelector('#cancelAddBtn');
  const confirmBtn = modal.querySelector('#confirmAddBtn');
  const checkboxes = modal.querySelectorAll('#addParticipantsList input[type="checkbox"]');

  // Validaciones en tiempo real para el modal de agregar
  function updateAddModalLimits() {
    const selected = [...checkboxes].filter(cb => cb.checked);
    const availableSlots = maxParticipants - currentParticipants.length;
    
    if (selected.length >= availableSlots) {
      checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
          checkbox.disabled = true;
          checkbox.parentElement.style.opacity = '0.6';
        }
      });
    } else {
      checkboxes.forEach(checkbox => {
        checkbox.disabled = false;
        checkbox.parentElement.style.opacity = '1';
      });
    }
    
    const counter = modal.querySelector('#addParticipantCounter');
    counter.textContent = `${currentParticipants.length + selected.length}/${maxParticipants} participantes (incluyéndote)`;
    
    confirmBtn.disabled = selected.length === 0;
  }

  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateAddModalLimits);
  });

  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  confirmBtn.addEventListener('click', () => {
    const newParticipants = [...checkboxes].filter(cb => cb.checked).map(cb => cb.value);
    const updatedParticipants = [...currentParticipants, ...newParticipants];
    
    // Actualizar la tarjeta del grupo
    updateGroupCard(card, updatedParticipants, maxParticipants);
    document.body.removeChild(modal);
  });

  // Cerrar modal al hacer click fuera
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// Función para actualizar la tarjeta del grupo
function updateGroupCard(card, participants, maxParticipants) {
  const participantsDetail = card.querySelector('.tournament-detail:first-child span:last-child');
  const statusDetail = card.querySelector('.tournament-detail:last-child span:last-child');
  const participantsList = card.querySelector('.participants-list');
  const joinBtn = card.querySelector('.join-btn');
  
  // Actualizar contadores
  participantsDetail.textContent = `${participants.length}/${maxParticipants}`;
  statusDetail.textContent = participants.length >= maxParticipants ? 'Lleno' : 'Activo';
  
  // Actualizar lista de participantes
  participantsList.innerHTML = participants.map(p => `<span class="participant">${p}</span>`).join('');
  
  // Actualizar botón
  if (participants.length >= maxParticipants) {
    joinBtn.textContent = 'Lleno';
    joinBtn.disabled = true;
    joinBtn.onclick = null;
  } else {
    joinBtn.textContent = 'Agregar Participante';
    joinBtn.disabled = false;
    joinBtn.onclick = function() {
      openAddParticipantModal(card, participants, maxParticipants);
    };
  }
}

// Función para obtener participantes disponibles
function getAvailableParticipants(currentParticipants) {
  const allParticipants = ['JuanPerez', 'MariaG', 'CarlosR', 'AnaT', 'LuisM', 'SofiaC', 'PedroV', 'LauraZ', 'RobertoF', 'ElenaM'];
  return allParticipants.filter(p => !currentParticipants.includes(p));
}

// Función para resetear el modal
function resetModal() {
  document.getElementById("groupName").value = "";
  document.getElementById("maxParticipants").value = "10";
  document.querySelectorAll("#participantsList input").forEach(cb => {
    cb.checked = false;
    cb.disabled = false;
    cb.parentElement.style.opacity = '1';
  });
  
  const counter = document.getElementById('selectedCounter');
  if (counter) {
    counter.textContent = '1/10 seleccionados (incluyéndote)';
  }
}

// Cerrar modal al hacer click fuera del contenido
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

// Inicializar contador al cargar la página
document.addEventListener('DOMContentLoaded', function() {
  const counter = document.createElement('div');
  counter.id = 'selectedCounter';
  counter.className = 'selected-counter';
  counter.textContent = '1/10 seleccionados (incluyéndote)';
  
  const participantsLabel = document.querySelector('label[for="participantsList"]');
  participantsLabel.parentNode.insertBefore(counter, participantsLabel.nextSibling);
});