-- Para convertir a un usuario en Súper Administrador
-- Cambia "correo_del_usuario@ejemplo.com" por tu correo real de inicio de sesión

UPDATE profiles
SET role = 'admin'
WHERE email = 'correo_del_usuario@ejemplo.com';
