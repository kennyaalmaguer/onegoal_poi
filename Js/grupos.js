
console.log(document.getElementById("groupsList"));
document.addEventListener("DOMContentLoaded", () => {

  const modal = document.getElementById("createGroupModal");
  const openModalBtn = document.getElementById("openModalBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const createBtn = document.getElementById("createBtn");
  const participantsList = document.getElementById("participantsList");
  const maxSelect = document.getElementById("maxParticipants");
  const selectedCounter = document.getElementById("selectedCounter");

  let selectedParticipants = [];

  // helper logs
  console.log("[grupos.js] DOMContentLoaded. elementos detectados:", {
    modal, openModalBtn, cancelBtn, createBtn, participantsList, maxSelect, selectedCounter
  });

  // Si faltan elementos importantes, avisar pero no romper la app
  if (!createBtn || !participantsList || !maxSelect || !selectedCounter) {
    console.warn("⚠️ Faltan algunos elementos del DOM (revisa los IDs).");
  }

  // Abrir modal
  if (openModalBtn) openModalBtn.addEventListener("click", () => { if (modal) modal.style.display = "flex"; });

  // Cerrar modal
  if (cancelBtn) cancelBtn.addEventListener("click", resetModal);
  window.addEventListener("click", e => { if (e.target === modal) resetModal(); });

  function resetModal() {
    if (modal) modal.style.display = "none";
    participantsList?.querySelectorAll("input[type=checkbox]").forEach(cb => {
      cb.checked = false;
      cb.disabled = false;
    });
    selectedParticipants = [];
    const gn = document.getElementById("groupName");
    if (gn) gn.value = "";
    selectedCounter && (selectedCounter.textContent = `0/${maxSelect?.value ?? 10} seleccionados`);
  }

  // 🔹 Cargar grupos (buscamos el contenedor justo al renderizar)
  async function loadGroups() {
    const groupsList = document.querySelector("#groupsList"); // <-- buscar aquí, en el momento
    console.log("[loadGroups] buscando #groupsList:", groupsList, "readyState:", document.readyState);

    if (!groupsList) {
      console.error("❌ #groupsList NO existe en el DOM al ejecutar loadGroups().");
      return;
    }

    try {
      const res = await fetch("php/listar_grupos.php");
      if (!res.ok) {
        console.error("Network error al pedir listar_grupos.php:", res.status);
        groupsList.innerHTML = "<p>Error cargando grupos (network).</p>";
        return;
      }

      const data = await res.json();
      console.log("[loadGroups] listar_grupos response:", data);

      groupsList.innerHTML = ""; // seguro que existe (ver arriba)

      if (data.status === "success" && Array.isArray(data.grupos)) {
        if (data.grupos.length === 0) {
          groupsList.innerHTML = "<p>No hay grupos aún.</p>";
          return;
        }

        data.grupos.forEach(grupo => {
          const nombresHTML = Array.isArray(grupo.participantes)
            ? grupo.participantes.map(p => `<span class="participant-name">${p.nombre}</span>`).join("")
            : "";
          const card = document.createElement("div");
          card.classList.add("tournament-card");

          // defensivo: asegurarse que campos existan
          const nombreGrupo = grupo.nombre ?? "Sin nombre";
          const creador = grupo.nombre_creador ?? "Anónimo";
          const participantesCount = Array.isArray(grupo.participantes) ? grupo.participantes.length : 0;
          const maxP = grupo.max_participantes ?? 10;
          const estado = grupo.estado ?? "Desconocido";
          const Puntos = grupo.Puntos ?? 0;
          const idGrupo = grupo.id_grupo ?? 0;
          const maxMostrar = 4;
          let participantesHTML = "";

          if (Array.isArray(grupo.participantes)) {
            const visibles = grupo.participantes.slice(0, maxMostrar);
            const restantes = grupo.participantes.length - maxMostrar;

            participantesHTML = visibles
              .map(p => `<span class="participant-chip">${p.nombre}</span>`)
              .join("");

            if (restantes > 0) {
              participantesHTML += `<span class="participant-chip more">+${restantes} más</span>`;
            }
          }
          let accionesHTML = "";

          if (grupo.soy_admin == 1 && grupo.soy_creador) {
            // si soy creador y admin
            accionesHTML = `
    <button class="cancel-btn" onclick="desactivarGrupo(${idGrupo})">Desactivar grupo</button>
    <button class="join-btn" onclick="abrirModalAgregar(${idGrupo})">Agregar participantes</button>
  `;
          } else {
            // si no soy admin → botón Unirse
            accionesHTML = `
    <button class="join-btn" onclick="unirseGrupo(${idGrupo})">Unirse</button>
  `;
          }


          card.innerHTML = `
            <div class="tournament-header">
              <div class="tournament-name">${nombreGrupo}</div>
                 <div class="tournament-creator">Creado por: ${creador}</div>
             </div>
            <div class="tournament-details">
                <div class="tournament-detail"><span>Participantes:</span> <span>${participantesCount}/${maxP}</span></div>
                <div class="tournament-detail"><span>Estado:</span> <span>${estado}</span></div>
            </div>
             <div class="participants">
             <div class="participants-title">Participantes:</div>
             <div class="participants-list">${participantesHTML}</div>
             </div>
           <div class="tournament-actions">${accionesHTML}</div>
           `;
          groupsList.appendChild(card);
        });
      } else {
        groupsList.innerHTML = `<p class="mensaje-alerta">❌ ${data.message ?? "Sin datos"}</p>`;
      }
    } catch (err) {
      console.error("[loadGroups] Error:", err);
      groupsList.innerHTML = "<p>Error cargando grupos.</p>";
    }
  }

  // 🔹 Cargar participantes disponibles
  async function loadParticipants() {
    if (!participantsList) {
      console.warn("[loadParticipants] no hay #participantsList en el DOM.");
      return;
    }
    try {
      const res = await fetch("php/listar_usuarios.php");
      const usuarios = await res.json();
      console.log("[loadParticipants] respuesta:", usuarios);
      participantsList.innerHTML = "";

      usuarios.forEach(usuario => {
        const label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" value="${usuario.id_usuario}"> ${usuario.nombre}`;
        participantsList.appendChild(label);
      });

      participantsList.querySelectorAll("input[type=checkbox]").forEach(cb => {
        cb.addEventListener("change", () => {
          selectedParticipants = [...participantsList.querySelectorAll("input[type=checkbox]:checked")].map(c => c.value);

          if (selectedParticipants.length >= parseInt(maxSelect.value)) {
            participantsList.querySelectorAll("input[type=checkbox]").forEach(cb => { if (!cb.checked) cb.disabled = true; });
          } else {
            participantsList.querySelectorAll("input[type=checkbox]").forEach(cb => cb.disabled = false);
          }

          selectedCounter && (selectedCounter.textContent = `${selectedParticipants.length}/${maxSelect.value} seleccionados`);
        });
      });

      selectedCounter && (selectedCounter.textContent = `0/${maxSelect.value} seleccionados`);
    } catch (err) {
      console.error("Error cargando participantes:", err);
    }
  }

  // 🔹 Crear grupo
  if (createBtn) {
    createBtn.addEventListener("click", async () => {
      const nombre = document.getElementById("groupName").value;
      const maxParticipantes = maxSelect.value;
      if (!nombre) return alert("⚠️ Ingresa un nombre para el grupo");

      const formData = new FormData();
      formData.append("nombre", nombre);
      formData.append("maxParticipantes", maxParticipantes);
      selectedParticipants.forEach(p => formData.append("participantes[]", p));

      try {
        const res = await fetch("php/grupo.php", { method: "POST", body: formData });
        const data = await res.json();
        console.log("[CrearGrupo] response:", data);

        if (data.status === "success") {
          alert("✅ " + data.message);
          resetModal();
          loadGroups();
        } else {
          alert("❌ " + data.message);
        }
      } catch (err) {
        console.error(err);
        alert("Error creando el grupo");
      }
    });
  }

  maxSelect?.addEventListener("change", () => {
    selectedCounter && (selectedCounter.textContent = `${selectedParticipants.length}/${maxSelect.value} seleccionados`);
    participantsList?.querySelectorAll("input[type=checkbox]").forEach(cb => cb.disabled = false);
  });

  // inicializar
  loadGroups();
  loadParticipants();
});

async function unirseGrupo(grupoId) {
  try {
    const res = await fetch("php/unirse_grupo.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "grupo_id=" + encodeURIComponent(grupoId)
    });
    const data = await res.json();
    alert((data.status === "success" ? "✅ " : "❌ ") + data.message);
    location.reload();
  } catch (err) {
    console.error(err);
    alert("Error al unirse al grupo");
  }
}

async function desactivarGrupo(grupoId) {
  try {
    const res = await fetch("php/desactivar_grupo.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "grupo_id=" + encodeURIComponent(grupoId)
    });
    const data = await res.json();
    alert((data.status === "success" ? "✅ " : "❌ ") + data.message);
    location.reload();
  } catch (err) {
    console.error(err);
  }
}

function abrirModalAgregar(grupoId) {
  // aquí puedes abrir un modal parecido al de crear grupo
  // pero solo mostrando usuarios que no están en ese grupo
  alert("Aquí abrirías modal para agregar participantes al grupo " + grupoId);
}