
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.prediction-form').forEach(form => {
    const inputs = form.querySelectorAll('input');
    const submitBtn = form.querySelector('.submit-btn');
    let isSaved = false;
    
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        if (isSaved) {
          submitBtn.textContent = 'Guardar Cambios';
          submitBtn.classList.remove('saved');
          submitBtn.disabled = false;
          form.classList.add('form-changed');
        }
      });
    });
    
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      submitBtn.textContent = '✓ Pronóstico Guardado';
      submitBtn.classList.add('saved');
      submitBtn.disabled = true;
      form.classList.remove('form-changed');
      isSaved = true;
    });
  });
});
