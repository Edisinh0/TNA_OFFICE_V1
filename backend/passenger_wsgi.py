"""
TNA Office API - Punto de entrada para Phusion Passenger (cPanel)

Este archivo es el punto de entrada para que cPanel reconozca
la aplicación FastAPI a través de Phusion Passenger.

INSTRUCCIONES DE CONFIGURACION EN CPANEL:
1. Ir a "Setup Python App" en cPanel
2. Crear una nueva aplicación Python
3. Seleccionar Python 3.9+ como versión
4. Configurar el Application Root: /home/USUARIO/tna-office-api
5. Configurar el Application URL: tu-dominio.com/api (o subdominio)
6. Configurar Application startup file: passenger_wsgi.py
7. Configurar Application Entry point: application
8. Guardar y ejecutar "pip install -r requirements.txt" en el entorno virtual
"""

import os
import sys

# Agregar el directorio de la aplicación al path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CURRENT_DIR)

# Cargar variables de entorno desde .env
from dotenv import load_dotenv
load_dotenv(os.path.join(CURRENT_DIR, '.env'))

# Importar la aplicación FastAPI
from server import app

# Crear el adaptador ASGI para Passenger
# Passenger espera una variable llamada 'application'
try:
    # Para Passenger con soporte ASGI nativo (versiones más recientes)
    application = app
except Exception as e:
    # Fallback: Usar un adaptador WSGI si ASGI no está disponible
    from a2wsgi import ASGIMiddleware
    application = ASGIMiddleware(app)

# Configuración adicional para desarrollo/debug
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('PORT', 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
