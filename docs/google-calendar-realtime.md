# Google Calendar, trabajos en segundo plano y tiempo real

## Configurar Google Calendar

1. En Google Cloud, habilita **Google Calendar API**.
2. Configura la pantalla de consentimiento OAuth y agrega las cuentas de prueba
   mientras la aplicación permanezca en modo de pruebas.
3. Crea credenciales OAuth de tipo **Aplicación web**.
4. Registra esta URI de redirección autorizada exactamente:

   `http://localhost:3000/api/integraciones/google-calendar/callback`

5. Completa en `.env`:

```dotenv
GOOGLE_CLIENT_ID=cliente.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=secreto_oauth
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integraciones/google-calendar/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=una_clave_aleatoria_distinta_de_al_menos_32_bytes
WEB_APP_URL=http://localhost:5173
```

Reinicia la API. En **Agenda**, cada usuario puede conectar o desconectar su
propia cuenta y sincronizar las citas del día seleccionado. Se usa el alcance
limitado `calendar.events`; los tokens se cifran con AES-256-GCM antes de
guardarse. Nunca se solicita ni almacena la contraseña de Google.

Las citas se identifican por orden y cuenta para actualizar el evento existente
en vez de duplicarlo. Hasta que el dominio modele hora final o duración, cada
cita sincronizada dura una hora.

## Tiempo real

El endpoint WebSocket autenticado es `/api/realtime`. Publica sobres con un
campo `type`, por lo que sirve para notificaciones, cambios de datos y resultados
de trabajos en segundo plano. La campana ya no depende de sondeo cada 30
segundos; mantiene la recarga por foco como recuperación ante desconexiones.

## Concurrencia

La sincronización con Google se ejecuta en una cola asíncrona con concurrencia
limitada y reporta el resultado por WebSocket. Las escrituras de auditoría y
notificaciones permanecen dentro de sus transacciones: moverlas a worker threads
rompería la atomicidad y no aceleraría operaciones de base de datos. El hash de
evidencias usa el pool de worker threads y las contraseñas usan `scrypt` asíncrono.

La cola actual vive en el proceso de la API y es apropiada para desarrollo o una
sola instancia. Antes de desplegar varias réplicas, se debe sustituir por una cola
persistente (por ejemplo, Redis/BullMQ) y un bus compartido para WebSockets.
