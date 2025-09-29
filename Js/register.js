const photoInput = document.getElementById("photo");
  const previewImg = document.getElementById("preview");

  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        previewImg.src = e.target.result;
        previewImg.style.display = "block";
      };
      reader.readAsDataURL(file);
    } else {
      previewImg.src = "";
      previewImg.style.display = "none";
    }
  });