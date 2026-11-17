# Taller · Agenda de estudio

Web app (PWA) para organizar la uni, el japonés y el máster:

- **Hoy**: agenda del día, próximas entregas con cuenta atrás y tareas pendientes.
- **Calendario**: horarios fijos semanales (clases) y entregas, exámenes o eventos.
- **Tareas**: tareas, ejercicios y estudio, agrupados por fecha y filtrables por categoría.
- **Máster**: proyectos con hitos y progreso, notas importantes y enlaces.

Funciona sin conexión y se puede instalar en el móvil. Con sesión de Google, los datos se sincronizan entre dispositivos (Firebase Auth + Firestore). Sin sesión, se guardan solo en el dispositivo.

Publicada en Firebase Hosting: https://taller-agenda-94c60.web.app

## Seguridad y privacidad

- **Sin secretos en el código.** `firebase-config.js` es configuración pública de Firebase; la clave de despliegue vive solo en los *secrets* de GitHub.
- **Datos validados.** Todo lo que entra (formularios, copias importadas, datos de la nube) pasa por `normalize()` en `app.js`: solo campos conocidos, con tipo, formato y longitud máxima. Todo lo que se muestra se escapa con `esc()`.
- **Reglas de Firestore** (`firestore.rules`): cada usuario solo lee y escribe `users/{su uid}/items`, y cada documento debe tener la forma esperada.
- **Cuentas**: inicio de sesión con Google (Firebase Auth). La app no guarda contraseñas; el límite de intentos y el cifrado los gestiona Google.
- **Cabeceras HTTP** (`firebase.json`): HTTPS obligatorio (HSTS), Content-Security-Policy, `nosniff`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`.
- **Sin terceros**: fuentes alojadas en `public/fonts`, sin analítica ni cookies de seguimiento. Solo se usa el almacenamiento del navegador, que es técnicamente necesario.
- **Privacidad**: Ajustes → «Privacidad y datos» (borrador pendiente de revisión). La app permite exportar los datos y eliminar la cuenta.

## Estructura

- `public/`: la app que se publica (HTML, CSS y JS sin frameworks).
- `public/firebase-config.js`: configuración pública de Firebase.
- `src/sync.js`: código de sincronización. Se empaqueta con el SDK de Firebase en `public/sync.bundle.js`.
- `firestore.rules`: reglas de seguridad. No se publican solas: se copian en Firebase → Firestore → Reglas, o con `npx firebase deploy --only firestore:rules`.
- `public/fonts/`: fuentes Inter y JetBrains Mono (OFL), copiadas con `npm run fonts`.

## Desarrollo

```bash
npm install
npm run build      # regenera public/sync.bundle.js tras cambiar src/sync.js
npm run serve      # http://localhost:8765
```

## Publicar

Se publica sola: cada cambio que llega a `main` dentro de `public/` lo despliega
GitHub Actions (`.github/workflows/deploy.yml`) en Firebase Hosting. También se
puede lanzar a mano desde la pestaña Actions → "Publicar en Firebase Hosting" → Run workflow.

Necesita el secreto `FIREBASE_SERVICE_ACCOUNT_TALLER_AGENDA_94C60` en el repositorio
(se crea una vez con `npx firebase init hosting:github`).

Publicar a mano desde el ordenador:

```bash
npx firebase login
npm run deploy
```
