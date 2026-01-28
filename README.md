# TNA Office - Versión MariaDB

## Descripción
Esta es la versión de TNA Office que utiliza MariaDB como base de datos en lugar de MongoDB.

## Requisitos del Sistema
- Python 3.9 o superior
- Node.js 18 o superior
- MariaDB 10.6 o superior (o MySQL 8.0)
- yarn (para el frontend)

## Estructura del Proyecto
```
TNAOffice_MariaDB/
├── backend/
│   ├── server.py          # API FastAPI con SQLAlchemy
│   ├── requirements.txt   # Dependencias de Python
│   └── .env               # Configuración (crear desde .env.example)
├── frontend/
│   ├── src/               # Código React
│   ├── package.json       # Dependencias Node
│   └── .env               # URL del backend
├── database_sql/
│   └── schema.sql         # Esquema de base de datos
└── scripts/
    └── migrate_data.py    # Script de migración desde MongoDB
```

## Instalación

### 1. Configurar Base de Datos

```bash
# Conectarse a MariaDB como root
mysql -u root -p

# Ejecutar el esquema
source /ruta/a/TNAOffice_MariaDB/database_sql/schema.sql
```

### 2. Configurar Backend

```bash
cd TNAOffice_MariaDB/backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con las credenciales de tu base de datos
```

### 3. Configurar Frontend

```bash
cd TNAOffice_MariaDB/frontend

# Instalar dependencias
yarn install

# Configurar URL del backend
# Editar .env con la URL correcta de tu API
```

### 4. Ejecutar la Aplicación

**Backend:**
```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend:**
```bash
cd frontend
yarn start
```

## Migración desde MongoDB

Si tienes datos en MongoDB que deseas migrar:

```bash
cd scripts
python migrate_data.py \
    --mongo-url "mongodb://localhost:27017" \
    --mysql-url "mysql+pymysql://usuario:contraseña@localhost:3306/tna_office_db" \
    --mongo-db "tna_office_db"
```

## Configuración de .env

### Backend (.env)
```env
DATABASE_URL="mysql+pymysql://usuario:contraseña@host:3306/tna_office_db"
JWT_SECRET="tu-clave-secreta-segura"
CORS_ORIGINS="http://localhost:3000,https://tudominio.com"
SMTP_HOST="mail.tudominio.com"
SMTP_PORT="465"
SMTP_USER="correo@tudominio.com"
SMTP_PASSWORD="tu-contraseña"
SMTP_FROM="correo@tudominio.com"
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## Credenciales por Defecto

- **Email:** admin@tnaoffice.cl
- **Contraseña:** admin123

**⚠️ IMPORTANTE:** Cambiar estas credenciales en producción.

## Diferencias con la Versión MongoDB

1. **Base de Datos:** MariaDB/MySQL en lugar de MongoDB
2. **ORM:** SQLAlchemy en lugar de Motor (MongoDB async driver)
3. **Relaciones:** Relaciones SQL nativas con foreign keys
4. **Consultas:** SQL en lugar de consultas MongoDB

## Soporte

Para soporte técnico, contactar a: contacto@tnaoffice.cl
