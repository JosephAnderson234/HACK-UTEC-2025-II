# API Interfaces

Este directorio contiene todos los tipados TypeScript para los contratos de request/response de las funciones Lambda del backend.

## Estructura

```
api/
├── index.ts          # Punto de entrada centralizado
├── common.ts         # Tipos comunes (paginación, filtros, estados)
├── auth.ts           # Endpoints de autenticación
├── reports.ts        # Endpoints de reportes
├── places.ts         # Endpoints de lugares
└── users.ts          # Endpoints de usuarios
```

## Endpoints Mapeados

### Autenticación (`auth.ts`)
- `POST /auth/register` - Registro de nuevos usuarios (solo estudiantes desde frontend)
- `POST /auth/login` - Inicio de sesión

### Reportes (`reports.ts`)
- `POST /reports/create` - Crear nuevo reporte (estudiantes)
- `POST /reports/update-status` - Actualizar estado de reporte (authority/admin)
- `GET /reports/my-reports` - Obtener reportes propios (estudiantes)
- `GET /reports` - Obtener todos los reportes con filtros (authority/admin)
- `GET /reports/{id_reporte}` - Obtener detalle de un reporte
- `GET /reports/assigned-to-me` - Reportes asignados a mí (authority)
- `POST /reports/{id_reporte}/take` - Auto-asignarse un reporte (authority)
- `POST /reports/{id_reporte}/assign` - Asignar reporte a autoridad (admin)

### Lugares (`places.ts`)
- `GET /places` - Listar lugares disponibles con filtros

### Usuarios (`users.ts`)
- `GET /users` - Listar usuarios con filtros (admin/authority)

## Uso

```typescript
import type {
  LoginRequest,
  LoginResponse,
  CreateReportRequest,
  CreateReportResponse,
  GetReportsParams,
  Report
} from '@/interfaces/api';

// En servicios
async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await fetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
  return response.json();
}

// En componentes
const [reports, setReports] = useState<Report[]>([]);
```

## Tipos Comunes

### Estados de Reporte
- `PENDIENTE` - Reporte recién creado
- `ATENDIENDO` - Reporte en proceso
- `RESUELTO` - Reporte completado

### Niveles de Urgencia
- `BAJA` - Prioridad baja
- `MEDIA` - Prioridad media  
- `ALTA` - Prioridad alta (requiere atención inmediata)

### Roles de Usuario
- `student` - Estudiante (crea reportes)
- `authority` - Autoridad (atiende reportes de su sector)
- `admin` - Administrador (acceso completo)

## Paginación

Todos los endpoints que retornan listas soportan paginación mediante:

```typescript
interface PaginationParams {
  page?: number;  // Número de página (default: 1)
  size?: number;  // Tamaño de página (default: 20)
}

interface PaginationResponse {
  current_page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}
```

## Filtros

Los endpoints de listado soportan filtros opcionales:

```typescript
interface FilterParams {
  estado?: ReportStatus;
  urgencia?: ReportUrgency;
  sector?: string;
  tower?: string;
  floor?: number;
  term?: string;        // Búsqueda de texto
  orderBy?: string;     // Campo de ordenamiento
  order?: 'asc' | 'desc';
}
```

## Notas

- Todos los timestamps usan formato ISO8601
- Las imágenes se envían como base64 en `CreateReportRequest.image`
- Los IDs son UUIDs v4
- La autenticación usa JWT en header `Authorization: Bearer <token>`
