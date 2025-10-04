document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("matches-container");

  // Traer partidos
  fetch("php/listar_partidos.php")
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (!data.success || !Array.isArray(data.partidos) || data.partidos.length === 0) {
        container.innerHTML = "<p class='no-matches'>No hay partidos disponibles por ahora.</p>";
        return;
      }

      data.partidos.forEach(p => {
        // Crear card
        const matchCard = document.createElement("div");
        matchCard.classList.add("match-card");
        matchCard.dataset.partidoId = p.id_partido;

        matchCard.innerHTML = `
          <div class="match-header">
            <div class="match-date">${p.fecha.split(' ')[0]} - ${p.hora || ''}</div>
            <div class="match-stage">${p.etapa || ''}</div>
          </div>

          <div class="teams">
            <div class="team">
              <div class="team-flag">${p.bandera_local || "🏳️"}</div>
              <div class="team-name">${p.equipo_local}</div>
            </div>
            <div class="vs">VS</div>
            <div class="team">
              <div class="team-flag">${p.bandera_visitante || "🏳️"}</div>
              <div class="team-name">${p.equipo_visitante}</div>
            </div>
          </div>

          <form class="prediction-form">
            <div class="score-input">
              <div class="score-input-group">
                <div class="score-label">${p.equipo_local}</div>
                <input class="score-input-field" type="number" name="goles_local" min="0" max="20" required>
              </div>
              <div class="score-separator">:</div>
              <div class="score-input-group">
                <div class="score-label">${p.equipo_visitante}</div>
                <input class="score-input-field" type="number" name="goles_visitante" min="0" max="20" required>
              </div>
            </div>

            <div class="first-scorer">
              <label>Primer Goleador:</label>
              <input type="text" name="primer_goleador" maxlength="50" placeholder="¿Quién hará el primer gol?">
            </div>

            <button type="submit" class="submit-btn">Guardar Pronóstico</button>
          </form>
        `;

        // Consultar si ya existe pronóstico del usuario para este partido
        fetch(`php/get_pronostico.php?id_partido=${p.id_partido}`)
          .then(r => r.json())
          .then(resp => {
            if (resp.success && resp.pronostico) {
              const form = matchCard.querySelector(".prediction-form");
              const inputs = form.querySelectorAll(".score-input-field");
              inputs[0].value = resp.pronostico.marcador_local ?? '';
              inputs[1].value = resp.pronostico.marcador_visitante ?? '';
              form.querySelector('input[name="primer_goleador"]').value = resp.pronostico.jugador_primer_gol ?? '';
              
              const btn = form.querySelector(".submit-btn");
              btn.textContent = '✓ Pronóstico Guardado';
              btn.disabled = true;
              btn.classList.add('saved');
            }
          })
          .catch(err => console.error("Error cargando pronóstico:", err));

        // Guardar pronóstico
        const form = matchCard.querySelector(".prediction-form");
        form.addEventListener("submit", e => {
          e.preventDefault();

          const golesLocal = form.querySelector('input[name="goles_local"]').value;
          const golesVisitante = form.querySelector('input[name="goles_visitante"]').value;
          const primerGoleador = form.querySelector('input[name="primer_goleador"]').value;
          const idPartido = matchCard.dataset.partidoId;

          if (!idPartido) {
            alert("No se puede guardar: falta ID del partido");
            return;
          }

          const formData = new FormData();
          formData.append("id_partido", idPartido);
          formData.append("goles_local", golesLocal);
          formData.append("goles_visitante", golesVisitante);
          formData.append("primer_goleador", primerGoleador);

          fetch("php/save_pronostico.php", {
            method: "POST",
            body: formData
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              const btn = form.querySelector(".submit-btn");
              btn.textContent = '✓ Pronóstico Guardado';
              btn.disabled = true;
              btn.classList.add('saved');
            } else {
              alert(data.mensaje || "Error guardando pronóstico");
            }
          })
          .catch(err => {
            console.error(err);
            alert("Error guardando pronóstico (ver consola).");
          });
        });

        container.appendChild(matchCard);
      });
    })
    .catch(err => {
      console.error("Error al cargar partidos:", err);
      container.innerHTML = "<p>Error al cargar los partidos.</p>";
    });
});