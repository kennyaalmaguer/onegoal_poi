ALTER TABLE mensaje MODIFY tipo ENUM('texto','imagen','video','audio','archivo') NOT NULL; 
ALTER TABLE mensaje MODIFY tipo ENUM('texto','imagen','video','audio','archivo','ubicacion') NOT NULL; 