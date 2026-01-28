# 🚀 INSTRUCCIONES DE INSTALACIÓN - TNA Office en cPanel

## 📋 Requisitos del Servidor
- cPanel con MySQL/MariaDB
- Python 3.9 o superior
- Node.js 16+ 
- Acceso SSH (recomendado)

---

## 📦 PASO 1: Crear la Base de Datos en cPanel

### Usando cPanel (interfaz web):
1. Ingresa a **cPanel** → **Bases de datos MySQL**
2. Crear una nueva base de datos: `tna_office_db`
3. Crear un usuario de base de datos: `tna_user` con contraseña segura
4. **Agregar usuario a la base de datos** con **TODOS LOS PRIVILEGIOS**

### Importar los datos:
1. Ir a **cPanel** → **phpMyAdmin**
2. Seleccionar la base de datos `tna_office_db`
3. Click en **Importar**
4. Subir el archivo: `database_sql/tna_office_cpanel.sql`
5. Click en **Ejecutar**

---

## 🔧 PASO 2: Configurar el Backend (Python/FastAPI)

### 2.1 Subir archivos
Sube la carpeta `backend/` a tu servidor, por ejemplo en:
```
/home/tu_usuario/tna_office/backend/
```

### 2.2 Crear entorno virtual
```bash
cd /home/tu_usuario/tna_office/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 2.3 Configurar archivo .env
Crear/editar el archivo `/home/tu_usuario/tna_office/backend/.env`:

```env
DATABASE_URL=mysql+pymysql://TU_USUARIO_DB:TU_PASSWORD@localhost:3306/tna_office_db
JWT_SECRET=genera-una-clave-secreta-muy-larga-y-segura-aqui-123456789
CORS_ORIGINS=https://tu-dominio.com
```

**⚠️ IMPORTANTE**: Reemplaza:
- `TU_USUARIO_DB` = usuario de MySQL que creaste
- `TU_PASSWORD` = contraseña del usuario
- `tu-dominio.com` = tu dominio real

### 2.4 Configurar Python App en cPanel
1. Ir a **cPanel** → **Setup Python App**
2. Click en **CREATE APPLICATION**
3. Configurar:
   - **Python version**: 3.9 o superior
   - **Application root**: `/home/tu_usuario/tna_office/backend`
   - **Application URL**: `/api` o subdominio `api.tu-dominio.com`
   - **Application startup file**: `server.py`
   - **Application Entry point**: `app`
4. Click en **CREATE**
5. En la sección de entorno virtual, ejecutar: `pip install -r requirements.txt`

---

## 🎨 PASO 3: Configurar el Frontend (React)

### 3.1 Subir archivos
Sube la carpeta `frontend/` a tu servidor.

### 3.2 Configurar .env del frontend
Editar `frontend/.env`:
```env
REACT_APP_BACKEND_URL=https://tu-dominio.com/api
```

### 3.3 Compilar el frontend
```bash
cd /home/tu_usuario/tna_office/frontend
npm install   # o yarn install
npm run build # o yarn build
```

### 3.4 Desplegar archivos estáticos
Copiar el contenido de la carpeta `build/` a `public_html/`:
```bash
cp -r build/* /home/tu_usuario/public_html/
```

---

## 🔐 CREDENCIALES DE ACCESO

| Campo    | Valor                |
|----------|---------------------|
| Email    | admin@tnaoffice.cl  |
| Password | admin123            |

**⚠️ IMPORTANTE**: Cambia estas credenciales después del primer acceso.

---

## ✅ VERIFICACIÓN

1. Abre tu navegador y ve a `https://tu-dominio.com`
2. Deberías ver la página de inicio (Fan Page)
3. Click en "ACCEDER AL SISTEMA"
4. Ingresa con las credenciales de arriba
5. Deberías ver el Dashboard con los datos

---

## 🛠️ SOLUCIÓN DE PROBLEMAS

### Error de conexión a la base de datos
- Verifica usuario y contraseña en `.env`
- Confirma que el usuario tiene permisos sobre la base de datos
- Revisa que la base de datos existe

### El frontend no conecta con el backend
- Verifica `REACT_APP_BACKEND_URL` en el `.env` del frontend
- Confirma que el backend está corriendo
- Revisa la configuración de CORS en el backend

### Error 500 en el backend
- Revisa los logs de Python en cPanel
- Verifica que todas las dependencias están instaladas
- Confirma que el archivo `.env` existe y tiene los valores correctos

### Problemas con permisos
```bash
chmod 755 /home/tu_usuario/tna_office/backend
chmod 644 /home/tu_usuario/tna_office/backend/.env
```

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
tna_office/
├── backend/
│   ├── server.py          # Backend principal
│   ├── requirements.txt   # Dependencias Python
│   └── .env              # Configuración (CREAR)
├── frontend/
│   ├── src/              # Código fuente React
│   ├── public/           # Archivos estáticos
│   ├── package.json      # Dependencias Node
│   └── .env              # Configuración frontend
└── database_sql/
    └── tna_office_cpanel.sql  # Script SQL completo
```

---

## 📞 SOPORTE

Para problemas técnicos, revisa:
1. Logs de Python en cPanel
2. Consola del navegador (F12)
3. Logs de error del servidor web

---

**Última actualización**: Enero 2026
