document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("createGroupModal");
  const openModalBtn = document.getElementById("openModalBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const createBtn = document.getElementById("createBtn");
  const participantsList = document.getElementById("participantsList");
  const maxSelect = document.getElementById("maxParticipants");
  const selectedCounter = document.getElementById("selectedCounter");

  // Modales y elementos para ver/agregar
  const participantsModal = document.getElementById("participantsModal");
  const participantsModalTitle = document.getElementById("participantsModalTitle");
  const participantsModalList = document.getElementById("participantsModalList");
  const closeParticipantsBtn = document.getElementById("closeParticipantsBtn");

  const addMembersModal = document.getElementById("addMembersModal");
  const addMembersList = document.getElementById("addMembersList");
  const addMembersCounter = document.getElementById("addMembersCounter");
  const closeAddMembersBtn = document.getElementById("closeAddMembersBtn");
  const confirmAddMembersBtn = document.getElementById("confirmAddMembersBtn");

  let selectedParticipants = []; // ids seleccionados en modal crear
  let addMembersSelected = []; // ids seleccionados en modal agregar
  let currentAddingGroupId = null;
  let currentGroupMax = 0;
  let currentGroupCount = 0;

  // Abrir modal crear -> cargar usuarios
  if (openModalBtn) {
    openModalBtn.addEventListener("click", async () => {
      await loadUsuariosParaCrear(); // carga checkboxes
      selectedParticipants = [];
      selectedCounter.textContent = `0/${maxSelect.value} seleccionados`;
      modal.style.display = "flex";
    });
  }
  if (cancelBtn) cancelBtn.addEventListener("click", resetModal);

  // Cerrar modales ver/agregar
  if (closeParticipantsBtn) closeParticipantsBtn.addEventListener("click", () => participantsModal.style.display = "none");
  if (closeAddMembersBtn) closeAddMembersBtn.addEventListener("click", () => addMembersModal.style.display = "none");

  // Reiniciar modal crear
  function resetModal() {
    modal.style.display = "none";
    participantsList.innerHTML = "";
    selectedParticipants = [];
    document.getElementById("groupName").value = "";
    selectedCounter.textContent = `0/${maxSelect.value} seleccionados`;
  }

  //  CARGAR USUARIOS PARA CREAR GRUPO (excluye al creador en servidor)
  async function loadUsuariosParaCrear() {
    participantsList.innerHTML = "<p>Cargando usuarios...</p>";
    try {
      const res = await fetch("php/listar_usuarios.php");
      const usuarios = await res.json();
      if (!Array.isArray(usuarios)) {
        participantsList.innerHTML = "<p>Error al cargar usuarios</p>";
        return;
      }
      participantsList.innerHTML = "";
      usuarios.forEach(u => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("checkbox-item");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = u.id_usuario;
        cb.id = "user_cb_" + u.id_usuario;
        cb.addEventListener("change", onSelectParticipant);

        const label = document.createElement("label");
        label.htmlFor = cb.id;
        label.textContent = u.nombre;

        wrapper.appendChild(cb);
        wrapper.appendChild(label);
        participantsList.appendChild(wrapper);
      });
    } catch (err) {
      console.error(err);
      participantsList.innerHTML = "<p>Error cargando usuarios</p>";
    }
  }

  // Manejar selección en modal crear — respeta el max
  function onSelectParticipant(e) {
    const max = parseInt(maxSelect.value, 10);
    if (e.target.checked) {
      if (selectedParticipants.length >= max - 1) {
        // -1 porque el creador cuenta como 1 (se agrega automáticamente)
        e.target.checked = false;
        alert("No puedes seleccionar más participantes del cupo del grupo (recuerda que tú eres el creador).");
        return;
      }
      selectedParticipants.push(e.target.value);
    } else {
      selectedParticipants = selectedParticipants.filter(id => id !== e.target.value);
    }
    selectedCounter.textContent = `${selectedParticipants.length}/${max} seleccionados`;
  }

  // Actualizar contador si cambia max antes de crear
  maxSelect.addEventListener("change", () => {
    selectedCounter.textContent = `${selectedParticipants.length}/${maxSelect.value} seleccionados`;
  });

  // Crear grupo (envía participantes seleccionados)
  if (createBtn) {
    createBtn.addEventListener("click", async () => {
      const nombre = document.getElementById("groupName").value.trim();
      const maxParticipantes = parseInt(maxSelect.value, 10);
      if (!nombre) return alert("⚠️ Ingresa un nombre para el grupo");

      // Validación cliente adicional: selected + creator <= max
      if (selectedParticipants.length + 1 > maxParticipantes) {
        return alert("El número de participantes (incluyéndote) excede el cupo.");
      }

      const formData = new FormData();
      formData.append("nombre", nombre);
      formData.append("maxParticipantes", maxParticipantes);
      selectedParticipants.forEach(p => formData.append("participantes[]", p));

      try {
        const res = await fetch("php/grupo.php", { method: "POST", body: formData });
        const data = await res.json();
        if (data.status === "success") {
          alert("✅ Grupo creado con éxito");
          resetModal();
          await loadGroups();
        } else {
          alert("❌ " + data.message);
        }
      } catch (err) {
        console.error(err);
        alert("Error creando grupo");
      }
    });
  }

  // CARGAR GRUPOS (inicial y después de cambios)
  async function loadGroups() {
    const groupsList = document.querySelector("#groupsList");
    try {
      const res = await fetch("php/listar_grupos.php");
      const data = await res.json();
      groupsList.innerHTML = "";

      if (data.status !== "success") {
        groupsList.innerHTML = "<p>Error cargando grupos.</p>";
        return;
      }

      // guardamos id de usuario actual (enviado por listar_grupos.php)
      const currentUserId = data.id_usuario;

      if (data.grupos.length === 0) {
        groupsList.innerHTML = "<p>No hay grupos aún.</p>";
        return;
      }

      data.grupos.forEach(grupo => {
        const card = document.createElement("div");
        card.classList.add("tournament-card");

        const participantesCount = grupo.participantes.length;

        // Mostrar solo primeros 4 chips y luego +N
        const chipsContainer = document.createElement("div");
        chipsContainer.classList.add("participants");
        const maxChips = 4;
        grupo.participantes.slice(0, maxChips).forEach(p => {
          const span = document.createElement("span");
          span.className = "participant-chip";
          span.textContent = p.nombre;
          chipsContainer.appendChild(span);
        });
        if (grupo.participantes.length > maxChips) {
          const more = document.createElement("span");
          more.className = "participant-chip more-chip";
          more.textContent = `+${grupo.participantes.length - maxChips}`;
          more.style.cursor = "pointer";
          more.addEventListener("click", () => verParticipantes(grupo.id_grupo));
          chipsContainer.appendChild(more);
        }

        // acciones
        const accionesDiv = document.createElement("div");
        accionesDiv.classList.add("tournament-actions");

        if (grupo.soy_creador) {
          // toggle + agregar + ver
          const checked = grupo.estado === "Activo";
          // switch (toggle)
          const switchLabel = document.createElement("label");
          switchLabel.className = "switch";
          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = checked;
          input.addEventListener("change", () => toggleEstado(grupo.id_grupo, input));
          const slider = document.createElement("span");
          slider.className = "slider";
          switchLabel.appendChild(input);
          switchLabel.appendChild(slider);

          const btnAgregar = document.createElement("button");
          btnAgregar.className = "btn btn-sm join-btn";
          btnAgregar.textContent = "Agregar";
          btnAgregar.addEventListener("click", () => abrirModalAgregar(grupo.id_grupo, grupo.max_participantes, participantesCount));

          const btnVer = document.createElement("button");
          btnVer.className = "btn btn-sm view-btn";
          btnVer.textContent = "👥";
          btnVer.addEventListener("click", () => verParticipantes(grupo.id_grupo));

          accionesDiv.appendChild(btnAgregar);
          accionesDiv.appendChild(btnVer);
          accionesDiv.appendChild(switchLabel);
        } else {
          // si no soy creador
         
  
          const btnUnirse = document.createElement("button");
         btnUnirse.className = "btn join-btn";
         btnUnirse.textContent = "Unirse";
         btnUnirse.addEventListener("click", () => unirseGrupo(grupo.id_grupo));
         accionesDiv.appendChild(btnUnirse);
        
  
       const btnVer = document.createElement("button");
       btnVer.className = "btn btn-sm view-btn";
       btnVer.textContent = "👥";
      btnVer.addEventListener("click", () => verParticipantes(grupo.id_grupo));
      accionesDiv.appendChild(btnVer);
            
        }

        card.innerHTML = `
          <div class="tournament-header">
            <div class="tournament-name">${escapeHtml(grupo.nombre)}</div>
            <div class="tournament-creator">Creado por: ${escapeHtml(grupo.nombre_creador)}</div>
          </div>
          <div class="tournament-details">
            <div><b>Participantes:</b> ${participantesCount}/${grupo.max_participantes}</div>
            <div><b>Estado:</b> ${grupo.estado}</div>
          </div>
        `;
        card.appendChild(chipsContainer);
        card.appendChild(accionesDiv);

        groupsList.appendChild(card);
      });
    } catch (err) {
      console.error("Error cargando grupos:", err);
      document.querySelector("#groupsList").innerHTML = "<p>Error cargando grupos.</p>";
    }
  }

  // ESCAPAR HTML para evitar inyecciones de texto
  function escapeHtml(text) {
    if (!text && text !== 0) return "";
    return String(text).replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  // UNIRSE A GRUPO (llama al PHP)
  async function unirseGrupo(grupoId) {
    try {
      const res = await fetch("php/unirse_grupo.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "grupo_id=" + encodeURIComponent(grupoId)
      });
      const data = await res.json();
      alert(data.message);
      if (data.status === "success") await loadGroups();
    } catch (err) {
      console.error(err);
      alert("Error al intentar unirte");
    }
  }

  // TOGGLE ESTADO (usa el PHP existente desactivar_grupo.php)
  async function toggleEstado(grupoId, checkbox) {
    const nuevoEstado = checkbox.checked ? "Activo" : "Inactivo";
    try {
      const res = await fetch("php/desactivar_grupo.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "grupo_id=" + encodeURIComponent(grupoId) + "&estado=" + encodeURIComponent(nuevoEstado)
      });
      const data = await res.json();
      alert(data.message);
      if (data.status === "success") await loadGroups();
    } catch (err) {
      console.error(err);
      alert("Error cambiando estado");
    }
  }

  // VER PARTICIPANTES -> abre modal con lista completa
  async function verParticipantes(grupoId) {
    participantsModalList.innerHTML = "Cargando...";
    participantsModalTitle.textContent = "Participantes";
    participantsModal.style.display = "flex";
    try {
      const res = await fetch("php/ver_participantes.php", { 
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "grupo_id=" + encodeURIComponent(grupoId)
      });
      const data = await res.json();
      if (data.status !== "success") {
        participantsModalList.innerHTML = "<p>Error cargando participantes</p>";
        return;
      }
      participantsModalList.innerHTML = "";
      data.participantes.forEach(p => {
        const div = document.createElement("div");
        div.className = "participant-row";
        div.textContent = p.nombre;
        participantsModalList.appendChild(div);
      });
    } catch (err) {
      console.error(err);
      participantsModalList.innerHTML = "<p>Error cargando participantes</p>";
    }
  }

  // ABRIR MODAL AGREGAR -> trae usuarios que no estén en el grupo, respeta cupo
  async function abrirModalAgregar(grupoId, maxParticipantes, currentCount) {
    addMembersList.innerHTML = "Cargando...";
    addMembersSelected = [];
    currentAddingGroupId = grupoId;
    currentGroupMax = parseInt(maxParticipantes, 10);
    currentGroupCount = parseInt(currentCount, 10);
    addMembersCounter.textContent = `0 seleccionados (cupos libres: ${currentGroupMax - currentGroupCount})`;
    addMembersModal.style.display = "flex";

    try {
      // pedir usuarios no pertenecientes al grupo
      const res = await fetch("php/listar_usuarios.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "grupo_id=" + encodeURIComponent(grupoId)
      });
      const usuarios = await res.json();
      addMembersList.innerHTML = "";
      if (!Array.isArray(usuarios) || usuarios.length === 0) {
        addMembersList.innerHTML = "<p>No hay usuarios disponibles para agregar.</p>";
        return;
      }
      usuarios.forEach(u => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("checkbox-item");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = u.id_usuario;
        cb.id = "add_cb_" + u.id_usuario;
        cb.addEventListener("change", onSelectAddMember);

        const label = document.createElement("label");
        label.htmlFor = cb.id;
        label.textContent = u.nombre;

        wrapper.appendChild(cb);
        wrapper.appendChild(label);
        addMembersList.appendChild(wrapper);
      });
    } catch (err) {
      console.error(err);
      addMembersList.innerHTML = "<p>Error cargando usuarios</p>";
    }
  }

  // manejar selección en modal agregar respetando cupo
  function onSelectAddMember(e) {
    const libre = currentGroupMax - currentGroupCount;
    if (e.target.checked) {
      if (addMembersSelected.length >= libre) {
        e.target.checked = false;
        alert("No hay cupo");
        return;
      }
      addMembersSelected.push(e.target.value);
    } else {
      addMembersSelected = addMembersSelected.filter(id => id !== e.target.value);
    }
    addMembersCounter.textContent = `${addMembersSelected.length} seleccionados (cupos libres: ${libre})`;
  }

  // confirmar agregar miembros
  if (confirmAddMembersBtn) {
    confirmAddMembersBtn.addEventListener("click", async () => {
      if (!currentAddingGroupId) return;
      if (addMembersSelected.length === 0) {
        alert("Selecciona al menos un usuario para agregar");
        return;
      }

      const libre = currentGroupMax - currentGroupCount;
      if (addMembersSelected.length > libre) {
        alert("No puedes agregar más usuarios de los cupos disponibles.");
        return;
      }

      const formData = new FormData();
      formData.append("grupo_id", currentAddingGroupId);
      addMembersSelected.forEach(id => formData.append("participantes[]", id));

      try {
        const res = await fetch("php/agregar_miembros.php", { method: "POST", body: formData });
        const data = await res.json();
        if (data.status === "success") {
          alert("Usuarios agregados con éxito");
          addMembersModal.style.display = "none";
          await loadGroups();
        } else {
          alert("Error: " + data.message);
        }
      } catch (err) {
        console.error(err);
        alert("Error agregando participantes");
      }
    });
  }

  // CARGAR inicialmente
  loadGroups();

  // Exponer algunas funciones globales por compatibilidad si en otro lado las llamas
  window.verParticipantes = verParticipantes;
  window.abrirModalAgregar = abrirModalAgregar;
  window.unirseGrupo = unirseGrupo;
  window.toggleEstado = toggleEstado;
});
