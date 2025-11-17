# 🚨 UTEC Alerta – Plataforma de Reportes y Notificaciones

UTEC Alerta es un sistema completo de **gestión de incidencias** para la Universidad de Ingeniería y Tecnología (UTEC).  
Incluye un backend serverless desplegable en AWS y un frontend moderno en React + TypeScript.

---

## 🧱 Monorepo del Proyecto

```bash
.
├── backend/              # Backend serverless (Python + AWS Lambda + API Gateway)
│   ├── serverless.yml    # Configuración principal de Serverless Framework
│   ├── requirements.txt  # Dependencias Python (boto3, PyJWT, requests, ...)
│   ├── functions/        # Lambdas de negocio (auth, reportes, notificaciones, ...)
│   ├── utils/            # Utilidades compartidas (JWT validator, helpers, etc.)
│   ├── resources/        # Definición infra (DynamoDB, S3, Parameter Store)
│   ├── dags/             # DAGs de Airflow para pipelines/estadísticas
│   ├── scripts/          # Scripts de carga de datos y pruebas rápidas
│   └── docs/             # Documentación interna (API, control de acceso, etc.)
└── frontend/             # Frontend (React 19 + TypeScript + Vite)
    ├── index.html
    ├── package.json      # Scripts: dev, build, lint, preview
    └── src/
        ├── context/      # AuthContext, AuthProvider
        ├── services/     # Clientes HTTP (auth, etc.)
        ├── store/        # Zustand store (authStore)
        ├── styles/       # Estilos globales
        └── utils/        # loaderEnv y utilidades de configuración
```

---

## 🏗️ Arquitectura General


<div align="center">
  <img src="backend/docs/svg/arquitectura.svg" alt="Arquitectura" style="max-width:100%; height:auto;" />
</div>

---

## 🧰 Tecnologías Utilizadas

### Backend (`/backend`)
- **Serverless Framework** (`org: leonardogst`, `service: utec-alerta`)
- **Python** (Lambdas)
- **AWS Lambda**, **API Gateway HTTP + WebSocket**
- **DynamoDB** (múltiples tablas)
- **S3** (almacenamiento de archivos)
- **EventBridge** (eventos de notificación)
- **SSM Parameter Store** (secretos/parametrización)
- Dependencias principales (`requirements.txt`):
  - `boto3`
  - `PyJWT`
  - `requests`


### Frontend (`/frontend`)
- **React 19**
- **TypeScript**
- **Vite 7**
- **Zustand** (estado global de autenticación)
- **@tanstack/react-query** (manejo de datos remotos)
- **react-hook-form** (formularios)
- **framer-motion** (animaciones)
- Scripts definidos en `package.json`:
  - `npm run dev` → entorno de desarrollo (Vite)
  - `npm run build` → build de producción
  - `npm run preview` → previsualizar build
  - `npm run lint` → linting

---

## 🔑 Configuración de Variables de Entorno

### Backend

Los parámetros sensibles se leen desde **AWS Systems Manager Parameter Store**.  
Los nombres concretos y cómo crearlos están detallados en:

- `backend/CONFIGURATION.md`
- `backend/resources/parameter-store.yml`

Entre ellos se incluye, por ejemplo:

- Secreto JWT
- Nombres de tablas DynamoDB
- Prefijos de S3

### Frontend

En la carpeta `frontend/` crear un archivo `.env` con, al menos:

```env
VITE_API_URL_AUTH=
VITE_API_URL_WS=
VITE_API_URL_REPORTS=
VITE_API_URL_PLACES=
VITE_API_URL_USERS=
VITE_API_URL_ADMIN=
VITE_API_URL_STATS=
VITE_API_URL_INCIDENTS=
```

Estas variables son consumidas por:

- `src/utils/loaderEnv.ts`
- `src/services/auth/index.ts`
- Contexto/estado de autenticación (`AuthProvider`, `authStore`)


>Importante, hay credenciales de prueba para que poblen sus tablas en dynamo db

---

## ▶️ Ejecución del Proyecto en Local

### 1. Clonar el repositorio

```bash
git clone <URL-DEL-REPO>.git
cd <nombre-del-repo>
```

---

### 2. Backend – Serverless (Python + AWS)

```bash
cd backend

# (Opcional) crear y activar entorno virtual
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

#### Ejecutar en local (si está configurado serverless-offline)

```bash
serverless offline
```

#### Desplegar a AWS

```bash
serverless deploy --stage dev
```

> Para más detalle (permisos IAM, parámetros SSM, stages, etc.), revisar:
> - `backend/DEPLOYMENT.md`
> - `backend/CONFIGURATION.md`

---

### 3. Frontend – React + Vite

```bash
cd frontend

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

Por defecto, Vite levantará la app en `http://localhost:5173` (o el puerto que indique la consola).

---

## 🔐 Flujo de Autenticación (Vista General)

1. El usuario se registra/inicia sesión desde el frontend.
2. El frontend llama a los endpoints expuestos en API Gateway (rutas definidas en `serverless.yml`).
3. El backend genera y firma un **JWT** (usando `PyJWT` y el secreto del Parameter Store).
4. El frontend guarda el token en el store (`Zustand`) y lo persiste (p. ej. en `localStorage`).
5. En cada llamada protegida, el frontend envía `Authorization: Bearer <token>`.
6. Para WebSocket, el cliente se conecta a la URL WS agregando el token como query param, y las Lambdas de conexión validan el JWT antes de registrar la conexión en DynamoDB.

> Detalle fino de roles, permisos y rutas: ver `backend/docs/ACCESS_CONTROL.md` y `backend/docs/API_REQUESTS.md`.



## 👥 Autores

Proyecto desarrollado como parte de cursos de la  
**Universidad de Ingeniería y Tecnología (UTEC)**.

- **Bruno William García López**  
- **Joel Modesto Cayllahua Hilario**
- **Nombre**
- **Joseph Anderson Cose Rojas**

---
