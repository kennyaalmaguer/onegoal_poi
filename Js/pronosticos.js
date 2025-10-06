document.addEventListener("DOMContentLoaded", () => {

  fetch("php/get_pronostico.php")
    .then(resp => resp.json())
    .then(data => {
      if (!data.success || !Array.isArray(data.pronosticos)) return;

      const pronMap = {};
      data.pronosticos.forEach(p => {
        pronMap[String(p.id_partido)] = p;
      });

      document.querySelectorAll(".match-card").forEach(card => {
        const partidoId = card.dataset.partidoId;
        const form = card.querySelector(".prediction-form");
        if (!form) return;

        const p = pronMap[partidoId];
        const scoreInputs = form.querySelectorAll(".score-input-field");
        const scorerInput = form.querySelector('input[name="primer_goleador"]');
        const submitBtn = form.querySelector(".submit-btn");

        if (p) {
          if (scoreInputs.length >= 2) {
            scoreInputs[0].value = p.goles_local !== null ? p.goles_local : '';
            scoreInputs[1].value = p.goles_visitante !== null ? p.goles_visitante : '';
          }
          if (scorerInput) scorerInput.value = p.jugador_primer_gol || '';
          submitBtn.textContent = '✓ Pronóstico Guardado';
          submitBtn.disabled = true;
          submitBtn.classList.add("saved");
        }

        // Detectar cambios
        let isSaved = !!p;
        form.querySelectorAll("input").forEach(input => {
          input.addEventListener("input", () => {
            if (isSaved) {
              submitBtn.textContent = 'Guardar Cambios';
              submitBtn.disabled = false;
              submitBtn.classList.remove("saved");
              form.classList.add("form-changed");
            }
          });
        });

        // Submit del formulario
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

          console.log("Enviando pronóstico:", Object.fromEntries(formData));

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



      });



    })

});