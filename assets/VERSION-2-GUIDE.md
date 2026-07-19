# Imaginable Things 2.0 — Panel de contenido

Esta versión convierte la galería en contenido administrable desde un panel visual.

## Qué cambia

- Las fotos de la galería ya no están escritas directamente en `index.html`.
- Los proyectos se cargan desde `data/projects.json`.
- `.pages.yml` conecta el repositorio con Pages CMS.
- Puedes añadir título, categoría, descripción, imagen y marcar proyectos destacados.
- Cada guardado crea un cambio en GitHub y Vercel publica la actualización automáticamente.

## Instalación en el repositorio

Copia todo el contenido de esta carpeta dentro de la carpeta local conectada a GitHub. Reemplaza los archivos cuando Windows lo pregunte.

Después ejecuta:

```bat
git add -A
git commit -m "Imaginable Things version 2.0 CMS"
git push
```

## Activar el panel

1. Abre `https://app.pagescms.org`.
2. Pulsa **Sign in with GitHub**.
3. Autoriza o instala la aplicación Pages CMS.
4. Selecciona el repositorio `NickieJam/imaginable-things`.
5. Abre **Portfolio Projects**.
6. Pulsa **Add item** dentro de Projects.
7. Escribe el título, elige la categoría, sube la foto y guarda.

Pages CMS editará GitHub directamente. Vercel detectará el cambio y publicará la nueva galería.

## Uso desde el celular

Puedes entrar a Pages CMS desde Chrome o Safari, iniciar sesión con GitHub, subir una foto del teléfono y guardar el proyecto.

## Importante

No borres `.pages.yml`, `data/projects.json` ni la carpeta `assets/uploads`.
