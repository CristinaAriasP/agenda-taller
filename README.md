# Taller · Agenda de estudio

Web app (PWA) para organizar la uni, el japonés y el máster:

- **Hoy**: agenda del día, próximas entregas con cuenta atrás y tareas pendientes.
- **Calendario**: horarios fijos semanales (clases) y entregas, exámenes o eventos.
- **Tareas**: tareas, ejercicios y estudio, agrupados por fecha y filtrables por categoría.
- **Máster**: proyectos con hitos y progreso, notas importantes y enlaces.

Funciona sin conexión y se puede instalar en el móvil. Con sesión de Google, los datos se sincronizan entre dispositivos (Firebase Auth + Firestore). Sin sesión, se guardan solo en el dispositivo.

Publicada en Firebase Hosting: https://taller-agenda-94c60.web.app

## Estructura

- `public/`: la app que se publica (HTML, CSS y JS sin frameworks).
- `public/firebase-config.js`: configuración pública de Firebase.
- `src/sync.js`: código de sincronización. Se empaqueta con el SDK de Firebase en `public/sync.bundle.js`.
- `firestore.rules`: reglas de seguridad (cada usuario solo accede a `users/{su uid}`).

## Desarrollo

```bash
npm install
npm run build      # regenera public/sync.bundle.js tras cambiar src/sync.js
npm run serve      # http://localhost:8765
```

## Publicar

```bash
npx firebase login
npm run deploy
```
