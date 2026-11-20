# Navajas

Aplicación web para la gestión de una barbería, con frontend en React/Vite y
backend en Node.js/Express conectado a MongoDB.

## Requisitos

- Node.js 20 o superior.
- pnpm 9 o superior.
- MongoDB local o una instancia de MongoDB Atlas.

Si pnpm no está instalado, puede habilitarse mediante Corepack:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## Instalación

1. Clonar el repositorio y acceder a la carpeta del proyecto:

   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd navajas
   ```

2. Instalar las dependencias de la aplicación:

   ```bash
   pnpm install:all
   ```

3. Crear `backend/.env` con la configuración del backend:

   ```env
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/navajas
   JWT_SECRET=cambiar-por-un-secreto-seguro
   JWT_EXPIRES=7d
   NODE_ENV=development
   APP_URL=http://localhost:5173
   CRON_SECRET=

   # En desarrollo los emails se muestran en la consola.
   EMAIL_PROVIDER=console
   EMAIL_TIMEOUT_MS=5000
   ```

   Para usar MongoDB Atlas, reemplazar `MONGO_URI` por la cadena de conexión
   proporcionada por Atlas.

4. Crear `frontend/.env` para que el frontend local consuma el backend:

   ```env
   API_URL=http://localhost:3000/api
   ```

## Ejecución en desarrollo

Desde la carpeta raíz, iniciar frontend y backend:

```bash
pnpm dev
```

- Frontend: <http://localhost:5173>
- Backend: <http://localhost:3000>
- Health check: <http://localhost:3000/api/health>

También pueden iniciarse por separado:

```bash
pnpm dev:backend
pnpm dev:frontend
```

## Crear el usuario administrador

Agregar temporalmente estas variables a `backend/.env`:

```env
ADMIN_EMAIL=admin@navajas.com
ADMIN_PASSWORD=una-clave-segura
ADMIN_NAME=Administrador
```

Luego ejecutar:

```bash
pnpm --prefix backend seed
```

El comando es seguro de repetir: no crea otro administrador si el email ya
existe.

## Build y producción

Generar el build del frontend:

```bash
pnpm build
```

Iniciar el backend:

```bash
pnpm start
```

Para desplegar en Vercel, configurar allí las variables de `backend/.env`
como variables de entorno del proyecto. El archivo `vercel.json` ya define el
build del frontend, las rutas `/api` y el cron de recordatorios.

## Comandos útiles

```bash
pnpm lint                         # Verificar el frontend
pnpm --prefix backend seed       # Crear el administrador
```
