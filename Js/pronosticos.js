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
          const idPartido = card.dataset.partidoId; // CORRECCIÓN: usar card en lugar de matchCard

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
                form.classList.remove("form-changed");
                
                // Mostrar mensaje de éxito
                showNotification('¡Pronóstico guardado y tarea completada!', 'success');
                
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
    .catch(err => {
      console.error("Error cargando pronósticos:", err);
    });
});

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
    color: white;
    border-radius: 5px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: 'Poppins', sans-serif;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}


// Función para verificar y mostrar resultados de partidos pasados
async function checkAndShowMatchResults() {
    try {
        const response = await fetch('php/get_matches.php');
        const data = await response.json();
        
        if (data.success) {
            const now = new Date();
            
            data.matches.forEach(match => {
                const matchDate = new Date(match.date);
                const card = document.querySelector(`.match-card[data-partido-id="${match.id}"]`);
                
                if (card && matchDate < now && match.resultado_final) {
                    // Este partido ya pasó y tiene resultado
                    showMatchResult(card, match);
                }
            });
        }
    } catch (error) {
        console.error('Error verificando resultados:', error);
    }
}

// Función para mostrar resultado del partido y verificar aciertos
function showMatchResult(card, match) {
    const form = card.querySelector('.prediction-form');
    if (!form) return;
    
    // Deshabilitar el formulario
    form.querySelectorAll('input, button').forEach(element => {
        element.disabled = true;
    });
    
    // Obtener el pronóstico del usuario
    const pronosticoLocal = form.querySelector('input[name="goles_local"]').value;
    const pronosticoVisitante = form.querySelector('input[name="goles_visitante"]').value;
    const pronosticoGoleador = form.querySelector('input[name="primer_goleador"]').value;
    
    // Parsear resultado real
    const [golesLocalReal, golesVisitanteReal] = match.resultado_final.split('-').map(Number);
    const primerGoleadorReal = match.jugador_primer_gol;
    
    // Verificar aciertos
    const aciertoResultado = pronosticoLocal && pronosticoVisitante && 
                             parseInt(pronosticoLocal) === golesLocalReal && 
                             parseInt(pronosticoVisitante) === golesVisitanteReal;
    
    const aciertoGoleador = pronosticoGoleador && primerGoleadorReal && 
                            pronosticoGoleador.toLowerCase() === primerGoleadorReal.toLowerCase();
    
    // Calcular puntuación
    let puntuacion = 0;
    if (aciertoResultado) puntuacion += 3; // 3 puntos por resultado exacto
    if (aciertoGoleador) puntuacion += 2; // 2 puntos por primer goleador
    
    // Crear elemento para mostrar resultados
    const resultDiv = document.createElement('div');
    resultDiv.className = 'match-result';
    
    // Determinar clase CSS según aciertos
    let resultadoClass = 'result-neutral';
    if (aciertoResultado && aciertoGoleador) {
        resultadoClass = 'result-perfect';
    } else if (aciertoResultado || aciertoGoleador) {
        resultadoClass = 'result-partial';
    }
    
    resultDiv.innerHTML = `
        <div class="result-header ${resultadoClass}">
            ${aciertoResultado && aciertoGoleador ? '🎯 ¡PRONÓSTICO PERFECTO!' : 
              aciertoResultado ? '✅ ¡Resultado correcto!' : 
              aciertoGoleador ? '⚽ ¡Primer goleador correcto!' : 
              '❌ Pronóstico incorrecto'}
        </div>
        <div class="result-real">
            <strong>Resultado Real:</strong> ${match.resultado_final} 
            ${primerGoleadorReal ? `(Primer gol: ${primerGoleadorReal})` : ''}
        </div>
        ${pronosticoLocal ? `
            <div class="result-user">
                <strong>Tu pronóstico:</strong> ${pronosticoLocal}-${pronosticoVisitante}
                ${pronosticoGoleador ? `(Primer gol: ${pronosticoGoleador})` : ''}
            </div>
        ` : ''}
        <div class="result-score">
            <strong>Puntuación:</strong> ${puntuacion} puntos
        </div>
    `;
    
    // Añadir estilos
    resultDiv.style.cssText = `
        background: #f8f9fa;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        padding: 15px;
        margin-top: 15px;
        font-family: 'Poppins', sans-serif;
    `;
    
    form.appendChild(resultDiv);
}

// Llamar esta función cuando cargue la página
checkAndShowMatchResults();



// Añadir estilos CSS para las animaciones
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .submit-btn.saved {
    background-color: #4CAF50 !important;
    cursor: not-allowed;
  }
  
  .form-changed {
    border-left: 4px solid #FFA000 !important;
  }
`;


document.head.appendChild(style);