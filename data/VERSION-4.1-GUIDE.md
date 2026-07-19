# Imaginable Things 4.1 Stable

Correcciones principales:

- Services carga desde `data/services.json` y las tarjetas dinámicas reciben la clase CSS correcta (`visible`).
- `Vinyl & Banners` está activo y visible.
- `Get a Quote` aparece dentro del menú móvil.
- Se eliminó la sección incompleta y duplicada del quote wizard.
- CSS, JavaScript, HTML y JSON usan configuración anti-caché para despliegues nuevos.

Publicación:

```bat
node --check script.js
git add .
git commit -m "Release stable version 4.1"
git push origin main
```
