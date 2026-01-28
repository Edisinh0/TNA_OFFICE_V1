# TNA Office - Guia de Despliegue en cPanel

Esta guia detalla el proceso completo para desplegar TNA Office (Frontend React + Backend FastAPI) en un servidor cPanel con VPS.

## Indice

1. [Requisitos Previos](#1-requisitos-previos)
2. [Configuracion de la Base de Datos](#2-configuracion-de-la-base-de-datos)
3. [Despliegue del Backend (API)](#3-despliegue-del-backend-api)
4. [Despliegue del Frontend](#4-despliegue-del-frontend)
5. [Configuracion de Dominios/Subdominios](#5-configuracion-de-dominiossubdominios)
6. [Verificacion y Pruebas](#6-verificacion-y-pruebas)
7. [Solucion de Problemas](#7-solucion-de-problemas)

---

## 1. Requisitos Previos

### En tu maquina local:
- Node.js 18+ instalado
- Python 3.9+ instalado
- Git instalado

### En cPanel:
- Acceso a cPanel con soporte para Python
- MySQL/MariaDB disponible
- Acceso SSH (recomendado)

---

## 2. Configuracion de la Base de Datos

### 2.1 Crear la base de datos en cPanel

1. Ir a **cPanel > MySQL Databases**
2. Crear una nueva base de datos:
   - Nombre: `tna_office_db` (cPanel agregara prefijo: `cpaneluser_tna_office_db`)
3. Crear un usuario de base de datos:
   - Usuario: `tna_user` (sera: `cpaneluser_tna_user`)
   - Password: Generar una contrasena segura
4. Agregar usuario a la base de datos con **TODOS LOS PRIVILEGIOS**

### 2.2 Importar el esquema SQL

**Opcion A: Desde phpMyAdmin**
1. Ir a **cPanel > phpMyAdmin**
2. Seleccionar la base de datos creada
3. Ir a la pestana **Import**
4. Subir el archivo `database_sql/schema_fixed.sql`
5. Ejecutar

**Opcion B: Desde SSH**
```bash
mysql -u cpaneluser_tna_user -p cpaneluser_tna_office_db < schema_fixed.sql
```

### 2.3 Verificar la importacion

En phpMyAdmin, verificar que existen las tablas:
- `users`
- `offices`
- `sales`
- `quotes`
- `quote_items`
- `tickets`
- `ticket_items`
- `commissions`
- `settings`

---

## 3. Despliegue del Backend (API)

### 3.1 Crear la aplicacion Python en cPanel

1. Ir a **cPanel > Setup Python App**
2. Click en **Create Application**
3. Configurar:
   - **Python version**: 3.9 o superior
   - **Application root**: `tna-office-api` (o el nombre que prefieras)
   - **Application URL**: `api.tu-dominio.com` o `tu-dominio.com/api`
   - **Application startup file**: `passenger_wsgi.py`
   - **Application Entry point**: `application`
4. Click en **Create**

### 3.2 Subir archivos del backend

**Opcion A: Usando File Manager de cPanel**
1. Ir a **cPanel > File Manager**
2. Navegar al directorio de la aplicacion (ej: `/home/usuario/tna-office-api`)
3. Subir los siguientes archivos desde la carpeta `backend/`:
   - `server.py`
   - `passenger_wsgi.py`
   - `requirements.txt`
   - `.env` (crear desde `.env.example`)

**Opcion B: Usando SSH/SFTP**
```bash
# Conectar via SSH
ssh usuario@tu-servidor.com

# Navegar al directorio
cd ~/tna-office-api

# Subir archivos (desde tu maquina local via SCP)
scp backend/* usuario@tu-servidor.com:~/tna-office-api/
```

### 3.3 Configurar variables de entorno

1. Crear archivo `.env` en el directorio del backend:

```env
# Base de datos (ajustar con tus credenciales de cPanel)
DATABASE_URL=mysql+pymysql://cpaneluser_tna_user:TU_PASSWORD@localhost:3306/cpaneluser_tna_office_db

# JWT - Generar clave segura
JWT_SECRET=genera-una-clave-muy-segura-de-64-caracteres-minimo-aqui

# CORS - URL del frontend
CORS_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com

# Configuracion
DEBUG=false
LOG_LEVEL=INFO
```

### 3.4 Instalar dependencias

1. Ir a **cPanel > Setup Python App**
2. Click en tu aplicacion
3. En la seccion **Configuration files**, asegurar que `requirements.txt` este listado
4. Click en **Run Pip Install** o ejecutar desde SSH:

```bash
# Activar entorno virtual (el path aparece en cPanel)
source /home/usuario/virtualenv/tna-office-api/3.9/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### 3.5 Reiniciar la aplicacion

1. En **cPanel > Setup Python App**
2. Click en **Restart** en tu aplicacion

### 3.6 Verificar el backend

Visitar: `https://api.tu-dominio.com/health` o `https://tu-dominio.com/api/health`

Deberia retornar:
```json
{"status": "healthy", "database": "connected"}
```

---

## 4. Despliegue del Frontend

### 4.1 Compilar el frontend localmente

```bash
# Navegar al directorio frontend
cd frontend

# Instalar dependencias
npm install

# Crear archivo .env para produccion
cp .env.example .env
```

Editar `.env`:
```env
VITE_API_URL=https://api.tu-dominio.com/api
VITE_APP_MODE=production
```

Compilar:
```bash
npm run build
```

Esto genera la carpeta `dist/` con los archivos estaticos.

### 4.2 Subir archivos al servidor

1. Ir a **cPanel > File Manager**
2. Navegar a `public_html` (o el directorio de tu dominio)
3. **Eliminar archivos existentes** (hacer backup primero si es necesario)
4. Subir TODO el contenido de la carpeta `dist/`:
   - `index.html`
   - `assets/` (carpeta completa)
   - Cualquier otro archivo generado
5. Subir el archivo `.htaccess` desde `frontend/.htaccess`

### 4.3 Verificar permisos

Asegurar que los archivos tengan permisos correctos:
- Archivos: 644
- Carpetas: 755

Desde SSH:
```bash
cd ~/public_html
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;
```

---

## 5. Configuracion de Dominios/Subdominios

### Opcion A: Backend en subdominio

1. Ir a **cPanel > Subdomains**
2. Crear subdominio: `api.tu-dominio.com`
3. Apuntar al directorio de la aplicacion Python

### Opcion B: Backend en subdirectorio

Si prefieres `tu-dominio.com/api`:

1. El frontend va en `public_html/`
2. La API se configura con Application URL: `/api`

### Configurar SSL

1. Ir a **cPanel > SSL/TLS Status**
2. Asegurar que ambos dominios tengan certificado SSL
3. O usar **Let's Encrypt** desde cPanel

---

## 6. Verificacion y Pruebas

### 6.1 Verificar Backend

```bash
# Health check
curl https://api.tu-dominio.com/health

# Login (ajustar credenciales)
curl -X POST https://api.tu-dominio.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tnaoffice.com","password":"admin123"}'
```

### 6.2 Verificar Frontend

1. Visitar `https://tu-dominio.com`
2. Verificar que carga la pagina de login
3. Intentar iniciar sesion con:
   - Email: `admin@tnaoffice.com`
   - Password: `admin123`
4. Navegar por las diferentes secciones

### 6.3 Verificar rutas SPA

1. Ir a cualquier ruta como `https://tu-dominio.com/offices`
2. Refrescar la pagina (F5)
3. Debe cargar correctamente (no error 404)

---

## 7. Solucion de Problemas

### Error 500 en el backend

1. Revisar logs de error:
   - **cPanel > Errors** o
   - SSH: `tail -f ~/logs/error.log`
2. Verificar que el archivo `.env` existe y tiene valores correctos
3. Verificar conexion a base de datos

### Error de CORS

1. Verificar que `CORS_ORIGINS` en `.env` incluye el dominio del frontend
2. No incluir `/` al final del dominio
3. Reiniciar la aplicacion Python despues de cambios

### Frontend muestra pagina en blanco

1. Abrir consola del navegador (F12)
2. Verificar errores de red
3. Asegurar que `VITE_API_URL` apunta al backend correcto
4. Recompilar el frontend si se cambio el `.env`

### Error 404 al refrescar paginas

1. Verificar que `.htaccess` existe en `public_html`
2. Verificar que `mod_rewrite` esta habilitado
3. El contenido debe ser el proporcionado en este proyecto

### Conexion a base de datos falla

1. Verificar credenciales en `DATABASE_URL`
2. El usuario de cPanel tiene prefijo (ej: `cpaneluser_`)
3. Probar conexion desde phpMyAdmin primero
4. Verificar que el usuario tiene permisos sobre la base de datos

### Passenger no inicia la aplicacion

1. Verificar que `passenger_wsgi.py` existe
2. Verificar que el entry point es `application`
3. Revisar logs de error de Passenger
4. Probar ejecutar manualmente:
   ```bash
   cd ~/tna-office-api
   source ../virtualenv/tna-office-api/3.9/bin/activate
   python -c "from passenger_wsgi import application; print('OK')"
   ```

---

## Credenciales por Defecto

**IMPORTANTE:** Cambiar estas credenciales inmediatamente despues del primer login.

- **Usuario Admin:**
  - Email: `admin@tnaoffice.com`
  - Password: `admin123`

Para cambiar la contrasena del admin:
1. Iniciar sesion
2. Ir a la seccion de usuarios
3. Editar el usuario admin
4. Cambiar la contrasena

---

## Comandos Utiles (SSH)

```bash
# Activar entorno virtual Python
source ~/virtualenv/tna-office-api/3.9/bin/activate

# Ver logs de error
tail -f ~/logs/error.log

# Reiniciar aplicacion (alternativa a cPanel)
touch ~/tna-office-api/tmp/restart.txt

# Verificar version de Python
python --version

# Probar conexion a MySQL
mysql -u cpaneluser_tna_user -p -e "SELECT 1"
```

---

## Estructura de Archivos Final

```
/home/usuario/
├── tna-office-api/          # Backend
│   ├── server.py
│   ├── passenger_wsgi.py
│   ├── requirements.txt
│   ├── .env
│   └── tmp/
│       └── restart.txt
│
└── public_html/             # Frontend
    ├── index.html
    ├── .htaccess
    └── assets/
        ├── index-xxxxx.js
        └── index-xxxxx.css
```

---

## Soporte

Si encuentras problemas no cubiertos en esta guia:

1. Revisar los logs de error en cPanel
2. Verificar la consola del navegador
3. Contactar al desarrollador con:
   - Mensaje de error exacto
   - Pasos para reproducir el problema
   - Capturas de pantalla si aplica
