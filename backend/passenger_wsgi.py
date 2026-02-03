import os
import sys
import traceback

# 1. Configuración de rutas
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(CURRENT_DIR, 'passenger_error.log')

def log_error(msg):
    """Escribe errores en un archivo de log para debug manual."""
    with open(LOG_FILE, 'a') as f:
        f.write(f"--- {os.uname()[1]} ---\n{msg}\n")

try:
    # 2. Asegurar que Python encuentre tu código (server.py)
    sys.path.insert(0, CURRENT_DIR)

    # 3. Forzar el uso del entorno virtual (VirtualEnv)
    # Buscamos la carpeta 'venv' o la que hayas creado en cPanel
    # Si tu carpeta tiene otro nombre, cámbiala aquí abajo
    INTERP = os.path.join(CURRENT_DIR, 'venv', 'bin', 'python')
    if os.path.exists(INTERP) and sys.executable != INTERP:
        os.execl(INTERP, INTERP, *sys.argv)

    # 4. Cargar variables de entorno desde el archivo 'env' (o '.env')
    from dotenv import load_dotenv
    # Intentamos cargar tanto '.env' como 'env' por si acaso
    load_dotenv(os.path.join(CURRENT_DIR, '.env'))
    load_dotenv(os.path.join(CURRENT_DIR, 'env'))

    # 5. Importar tu app de FastAPI
    # Asegúrate de que tu archivo se llame server.py y tenga un objeto 'app'
    from server import app
    from a2wsgi import ASGIMiddleware

    # 6. Punto de entrada para Phusion Passenger (WSGI)
    application = ASGIMiddleware(app)

except Exception as e:
    # Si algo falla, lo guardamos en el log y lo mostramos en pantalla
    error_detail = traceback.format_exc()
    log_error(error_detail)
    
    def application(environ, start_response):
        status = '500 Internal Server Error'
        output = f"Error crítico al iniciar la aplicación:\n\n{error_detail}".encode('utf-8')
        response_headers = [('Content-type', 'text/plain'), ('Content-Length', str(len(output)))]
        start_response(status, response_headers)
        return [output]