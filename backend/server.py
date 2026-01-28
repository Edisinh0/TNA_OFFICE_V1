from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import uuid
import os
from contextlib import asynccontextmanager
from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, Text, DateTime, Date, Time, Enum, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.pool import QueuePool
import enum
from dotenv import load_dotenv
from pathlib import Path

# Load .env file
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ============ CONFIGURACIÓN ============

DATABASE_URL = os.environ.get('DATABASE_URL', 'mysql+pymysql://root@localhost:3306/tna_office_db')
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# ============ DATABASE SETUP ============

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
    pool_recycle=3600
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============ ENUMS ============

class UserRole(str, enum.Enum):
    admin = "admin"
    comisionista = "comisionista"
    cliente = "cliente"

class OfficeStatus(str, enum.Enum):
    available = "available"
    occupied = "occupied"
    maintenance = "maintenance"

class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"

class TicketStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    partial = "partial"
    paid = "paid"

class RequestStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"

class ServiceStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"

class ParkingType(str, enum.Enum):
    parking = "parking"
    storage = "storage"

class ResourceType(str, enum.Enum):
    room = "room"
    booth = "booth"

class DurationType(str, enum.Enum):
    hourly = "hourly"
    half_day = "half_day"
    full_day = "full_day"

# ============ SQLALCHEMY MODELS ============

class ProfileDB(Base):
    __tablename__ = "profiles"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    allowed_modules = Column(JSON)
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserDB(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.cliente)
    profile_id = Column(String(36), ForeignKey('profiles.id'))
    commission_percentage = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    profile = relationship("ProfileDB")

class CategoryDB(Base):
    __tablename__ = "categories"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(Text)
    parent_id = Column(String(36), ForeignKey('categories.id'))
    created_at = Column(DateTime, default=datetime.utcnow)

class ProductDB(Base):
    __tablename__ = "products"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category_id = Column(String(36), ForeignKey('categories.id'))
    base_price = Column(Float, default=0.0)
    unit = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ClientDB(Base):
    __tablename__ = "clients"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name = Column(String(255), nullable=False)
    rut = Column(String(20))
    business_type = Column(String(100))
    address = Column(Text)
    phone = Column(String(50))
    email = Column(String(255))
    contact_name = Column(String(255))
    contact_phone = Column(String(50))
    contact_email = Column(String(255))
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    documents = relationship("ClientDocumentDB", back_populates="client", cascade="all, delete-orphan")

class ClientDocumentDB(Base):
    __tablename__ = "client_documents"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(36), ForeignKey('clients.id'), nullable=False)
    name = Column(String(255), nullable=False)
    file_url = Column(Text)
    document_type = Column(String(100))
    expiry_date = Column(Date)
    notifications_enabled = Column(Boolean, default=False)
    notification_days = Column(Integer, default=30)
    created_at = Column(DateTime, default=datetime.utcnow)
    client = relationship("ClientDB", back_populates="documents")

class OfficeDB(Base):
    __tablename__ = "offices"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    office_number = Column(String(20), nullable=False)
    floor = Column(Integer)
    location = Column(String(100))
    square_meters = Column(Float)
    capacity = Column(Integer)
    status = Column(Enum(OfficeStatus), default=OfficeStatus.available)
    client_id = Column(String(36), ForeignKey('clients.id'))
    sale_value_uf = Column(Float, default=0.0)
    billed_value_uf = Column(Float, default=0.0)
    cost_uf = Column(Float, default=0.0)
    cost_difference_uf = Column(Float, default=0.0)
    contract_start = Column(Date)
    contract_end = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    client = relationship("ClientDB")

class ParkingStorageDB(Base):
    __tablename__ = "parking_storage"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    number = Column(String(20), nullable=False)
    type = Column(Enum(ParkingType), default=ParkingType.parking)
    location = Column(String(100))
    status = Column(Enum(OfficeStatus), default=OfficeStatus.available)
    client_id = Column(String(36), ForeignKey('clients.id'))
    sale_value_uf = Column(Float, default=0.0)
    billed_value_uf = Column(Float, default=0.0)
    cost_uf = Column(Float, default=0.0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    client = relationship("ClientDB")

class RoomDB(Base):
    __tablename__ = "rooms"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    capacity = Column(Integer)
    hourly_rate = Column(Float, default=0.0)
    half_day_rate = Column(Float, default=0.0)
    full_day_rate = Column(Float, default=0.0)
    amenities = Column(JSON)
    color = Column(String(20))
    status = Column(String(20), default='active')
    blocks_rooms = Column(JSON)
    related_rooms = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class BoothDB(Base):
    __tablename__ = "booths"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    hourly_rate = Column(Float, default=0.0)
    half_day_rate = Column(Float, default=0.0)
    full_day_rate = Column(Float, default=0.0)
    color = Column(String(20))
    status = Column(String(20), default='active')
    created_at = Column(DateTime, default=datetime.utcnow)

class BookingDB(Base):
    __tablename__ = "bookings"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resource_type = Column(Enum('room', 'booth', name='resource_type_enum'), nullable=False)
    resource_id = Column(String(36), nullable=False)
    resource_name = Column(String(100))
    client_name = Column(String(255), nullable=False)
    client_email = Column(String(255))
    client_phone = Column(String(50))
    date = Column(Date)
    start_time = Column(Time)
    end_time = Column(Time)
    duration_hours = Column(Float)
    total_price = Column(Float, default=0.0)
    status = Column(Enum('pending', 'confirmed', 'cancelled', 'completed', name='booking_status_enum'), default='pending')
    notes = Column(Text)

class MonthlyServiceCatalogDB(Base):
    __tablename__ = "monthly_services_catalog"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    base_price_uf = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class MonthlyServiceDB(Base):
    __tablename__ = "monthly_services"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    service_name = Column(String(255), nullable=False)
    category = Column(String(100))
    client_id = Column(String(36), ForeignKey('clients.id'))
    sale_value_uf = Column(Float, default=0.0)
    billed_value_uf = Column(Float, default=0.0)
    cost_uf = Column(Float, default=0.0)
    status = Column(Enum(ServiceStatus), default=ServiceStatus.active)
    start_date = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    client = relationship("ClientDB")

# NOTA: Las tablas tickets y ticket_items NO EXISTEN en la base de datos
# class TicketDB(Base):
#     __tablename__ = "tickets"
#     id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
#     ticket_number = Column(String(50))
#     client_id = Column(String(36), ForeignKey('clients.id'))
#     client_name = Column(String(255))
#     status = Column(Enum(TicketStatus), default=TicketStatus.pending)
#     payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.pending)
#     subtotal = Column(Float, default=0.0)
#     tax = Column(Float, default=0.0)
#     total = Column(Float, default=0.0)
#     notes = Column(Text)
#     comisionista_id = Column(String(36))
#     created_by = Column(String(36))
#     created_at = Column(DateTime, default=datetime.utcnow)
#     items = relationship("TicketItemDB", back_populates="ticket", cascade="all, delete-orphan")
#     client = relationship("ClientDB")

# class TicketItemDB(Base):
#     __tablename__ = "ticket_items"
#     id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
#     ticket_id = Column(String(36), ForeignKey('tickets.id'), nullable=False)
#     product_id = Column(String(36))
#     product_name = Column(String(255))
#     description = Column(Text)
#     quantity = Column(Integer, default=1)
#     unit_price = Column(Float, default=0.0)
#     total = Column(Float, default=0.0)
#     ticket = relationship("TicketDB", back_populates="items")

class RequestDB(Base):
    __tablename__ = "requests"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_number = Column(Integer, autoincrement=True, unique=True)
    client_name = Column(String(255))
    client_email = Column(String(255))
    client_phone = Column(String(50))
    company_name = Column(String(255))
    request_type = Column(String(100))
    description = Column(Text)
    status = Column(Enum('pending', 'in_progress', 'completed', 'cancelled', name='request_status_enum'), default='pending')
    priority = Column(Enum('low', 'medium', 'high', name='request_priority_enum'), default='medium')
    assigned_to = Column(String(36))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class QuoteDB(Base):
    __tablename__ = "quotes"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quote_number = Column(Integer, autoincrement=True, unique=True)
    client_name = Column(String(255))
    client_email = Column(String(255))
    client_phone = Column(String(50))
    company_name = Column(String(255))
    items = Column(JSON)
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    status = Column(Enum('draft', 'sent', 'accepted', 'rejected', 'expired', name='quote_status_enum'), default='draft')
    valid_until = Column(Date)
    notes = Column(Text)
    created_by = Column(String(36))
    created_at = Column(DateTime, default=datetime.utcnow)

# NOTA: La tabla quote_items NO EXISTE en la base de datos
# Los items de las cotizaciones se almacenan como JSON en la columna 'items' de la tabla 'quotes'
# class QuoteItemDB(Base):
#     __tablename__ = "quote_items"
#     id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
#     quote_id = Column(String(36), ForeignKey('quotes.id'), nullable=False)
#     product_id = Column(String(36))
#     product_name = Column(String(255))
#     description = Column(Text)
#     quantity = Column(Integer, default=1)
#     unit_price = Column(Float, default=0.0)
#     total = Column(Float, default=0.0)
#     quote = relationship("QuoteDB", back_populates="items")

class QuoteTemplateDB(Base):
    __tablename__ = "quote_templates"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    content = Column(Text)
    variables = Column(JSON)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class SaleDB(Base):
    __tablename__ = "sales"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id = Column(String(36))
    product_id = Column(String(36))
    product_name = Column(String(255))
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    sale_date = Column(Date)
    comisionista_id = Column(String(36))
    commission_amount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class FloorPlanCoordinateDB(Base):
    __tablename__ = "floor_plan_coordinates"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    office_id = Column(String(36), ForeignKey('offices.id'))
    office_number = Column(String(20))
    x = Column(Float)
    y = Column(Float)
    width = Column(Float)
    height = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class InvoiceDB(Base):
    __tablename__ = "invoices"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_number = Column(String(50))
    ticket_id = Column(String(36), ForeignKey('tickets.id'))
    client_id = Column(String(36), ForeignKey('clients.id'))
    issue_date = Column(Date)
    due_date = Column(Date)
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    status = Column(String(50), default='draft')
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

# ============ PYDANTIC MODELS ============

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "cliente"
    profile_id: Optional[str] = None
    commission_percentage: Optional[float] = 0.0

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[str] = None
    profile_id: Optional[str] = None
    commission_percentage: Optional[float] = None
    password: Optional[str] = None

class ProfileCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    allowed_modules: List[str] = []

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    allowed_modules: Optional[List[str]] = None

# ============ SECURITY ============

security = HTTPBearer()

def verify_password(plain_password, hashed_password):
    """Verifica una contraseña contra su hash bcrypt"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    """Genera un hash bcrypt para una contraseña"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

# ============ HELPER FUNCTIONS ============

def db_to_dict(obj, exclude=None):
    """Convert SQLAlchemy object to dictionary"""
    from datetime import date, time, timedelta
    if obj is None:
        return None
    exclude = exclude or []
    result = {}
    for column in obj.__table__.columns:
        if column.name not in exclude:
            value = getattr(obj, column.name)
            if isinstance(value, datetime):
                value = value.isoformat()
            elif isinstance(value, date):
                value = value.isoformat()
            elif isinstance(value, time):
                value = value.strftime("%H:%M")
            elif isinstance(value, timedelta):
                total_seconds = int(value.total_seconds())
                hours, remainder = divmod(total_seconds, 3600)
                minutes = remainder // 60
                value = f"{hours:02d}:{minutes:02d}"
            elif isinstance(value, enum.Enum):
                value = value.value
            result[column.name] = value
    return result

# ============ APP SETUP ============

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    # Base.metadata.create_all(bind=engine)  # Comentado: tablas ya existen en la BD
    yield
    # Shutdown
    engine.dispose()

app = FastAPI(title="TNA Office API - MariaDB", lifespan=lifespan)

# CORS
cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins + ['http://localhost:3000'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_access_token({"sub": user.id})
    user_dict = db_to_dict(user, exclude=['password'])
    
    # Add profile info
    if user.profile:
        user_dict['allowed_modules'] = user.profile.allowed_modules or []
    else:
        user_dict['allowed_modules'] = []
    
    return {"token": token, "user": user_dict}

@api_router.post("/auth/register")
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(UserDB).filter(UserDB.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    new_user = UserDB(
        id=str(uuid.uuid4()),
        email=user_data.email,
        password=get_password_hash(user_data.password),
        name=user_data.name,
        role=user_data.role,
        profile_id=user_data.profile_id,
        commission_percentage=user_data.commission_percentage or 0.0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return db_to_dict(new_user, exclude=['password'])

@api_router.get("/auth/me")
def get_me(current_user: UserDB = Depends(get_current_user)):
    user_dict = db_to_dict(current_user, exclude=['password'])
    if current_user.profile:
        user_dict['allowed_modules'] = current_user.profile.allowed_modules or []
    return user_dict

# ============ PROFILES ENDPOINTS ============

AVAILABLE_MODULES = [
    'dashboard', 'resources', 'products', 'clients', 'offices',
    'parking-storage', 'monthly-services', 'quotes', 'comisionistas',
    'tickets', 'requests', 'reports', 'users'
]

@api_router.get("/profiles")
def get_profiles(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    profiles = db.query(ProfileDB).all()
    return [db_to_dict(p) for p in profiles]

@api_router.post("/profiles")
def create_profile(data: ProfileCreate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    profile = ProfileDB(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.description,
        allowed_modules=data.allowed_modules
    )
    db.add(profile)
    db.commit()
    return db_to_dict(profile)

@api_router.put("/profiles/{profile_id}")
def update_profile(profile_id: str, data: ProfileUpdate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    profile = db.query(ProfileDB).filter(ProfileDB.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    if data.name is not None:
        profile.name = data.name
    if data.description is not None:
        profile.description = data.description
    if data.allowed_modules is not None:
        profile.allowed_modules = data.allowed_modules
    
    db.commit()
    return db_to_dict(profile)

@api_router.delete("/profiles/{profile_id}")
def delete_profile(profile_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    profile = db.query(ProfileDB).filter(ProfileDB.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    if profile.is_system:
        raise HTTPException(status_code=400, detail="No se puede eliminar perfil del sistema")
    
    db.delete(profile)
    db.commit()
    return {"message": "Perfil eliminado"}

@api_router.get("/modules")
def get_modules(current_user: UserDB = Depends(get_current_user)):
    return [
        {"id": "dashboard", "name": "Dashboard", "description": "Panel principal"},
        {"id": "resources", "name": "Recursos", "description": "Salas y casetas"},
        {"id": "products", "name": "Productos", "description": "Catálogo"},
        {"id": "clients", "name": "Clientes", "description": "Gestión de clientes"},
        {"id": "offices", "name": "Oficinas", "description": "Gestión de oficinas"},
        {"id": "parking-storage", "name": "Estacionamientos", "description": "Estacionamientos y bodegas"},
        {"id": "monthly-services", "name": "Servicios Mensuales", "description": "Servicios recurrentes"},
        {"id": "quotes", "name": "Cotizaciones", "description": "Cotizaciones"},
        {"id": "comisionistas", "name": "Comisionistas", "description": "Comisionistas"},
        {"id": "tickets", "name": "Ventas", "description": "Ventas"},
        {"id": "requests", "name": "Solicitudes", "description": "Solicitudes"},
        {"id": "reports", "name": "Reportes", "description": "Reportes"},
        {"id": "users", "name": "Usuarios", "description": "Usuarios y perfiles"}
    ]

# ============ USERS ENDPOINTS ============

@api_router.get("/users")
def get_users(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    users = db.query(UserDB).all()
    result = []
    for user in users:
        user_dict = db_to_dict(user, exclude=['password'])
        if user.profile:
            user_dict['profile_name'] = user.profile.name
            user_dict['allowed_modules'] = user.profile.allowed_modules or []
        result.append(user_dict)
    return result

@api_router.get("/users/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user_dict = db_to_dict(user, exclude=['password'])
    if user.profile:
        user_dict['profile_name'] = user.profile.name
        user_dict['allowed_modules'] = user.profile.allowed_modules or []
    else:
        user_dict['allowed_modules'] = AVAILABLE_MODULES if user.role == 'admin' else []
    return user_dict

@api_router.put("/users/{user_id}")
def update_user(user_id: str, data: UserUpdate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if data.email is not None:
        user.email = data.email
    if data.name is not None:
        user.name = data.name
    if data.role is not None:
        user.role = data.role
    if data.profile_id is not None:
        user.profile_id = data.profile_id if data.profile_id else None
    if data.commission_percentage is not None:
        user.commission_percentage = data.commission_percentage
    if data.password:
        user.password = get_password_hash(data.password)
    
    db.commit()
    return db_to_dict(user, exclude=['password'])

@api_router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Solo administradores")
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte")
    
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db.delete(user)
    db.commit()
    return {"message": "Usuario eliminado"}

# ============ CLIENTS ENDPOINTS ============

@api_router.get("/clients")
def get_clients(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    clients = db.query(ClientDB).filter(ClientDB.is_active == True).all()
    result = []
    for client in clients:
        client_dict = db_to_dict(client)
        client_dict['documents'] = [db_to_dict(d) for d in client.documents]
        result.append(client_dict)
    return result

@api_router.post("/clients")
def create_client(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    client = ClientDB(
        id=str(uuid.uuid4()),
        company_name=data.get('company_name'),
        rut=data.get('rut'),
        business_type=data.get('business_type'),
        address=data.get('address'),
        phone=data.get('phone'),
        email=data.get('email'),
        contact_name=data.get('contact_name'),
        contact_phone=data.get('contact_phone'),
        contact_email=data.get('contact_email'),
        notes=data.get('notes')
    )
    db.add(client)
    db.commit()
    return db_to_dict(client)

@api_router.get("/clients/{client_id}")
def get_client(client_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    client_dict = db_to_dict(client)
    client_dict['documents'] = [db_to_dict(d) for d in client.documents]
    return client_dict

@api_router.put("/clients/{client_id}")
def update_client(client_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    for key, value in data.items():
        if hasattr(client, key) and key != 'id':
            setattr(client, key, value)
    
    db.commit()
    return db_to_dict(client)

@api_router.delete("/clients/{client_id}")
def delete_client(client_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    client.is_active = False
    db.commit()
    return {"message": "Cliente eliminado"}

# ============ OFFICES ENDPOINTS ============

@api_router.get("/offices")
def get_offices(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    offices = db.query(OfficeDB).all()
    result = []
    for office in offices:
        office_dict = db_to_dict(office)
        if office.client:
            office_dict['client_name'] = office.client.company_name
        result.append(office_dict)
    return result

@api_router.post("/offices")
def create_office(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    office = OfficeDB(
        id=str(uuid.uuid4()),
        office_number=data.get('office_number'),
        floor=data.get('floor'),
        location=data.get('location'),
        square_meters=data.get('square_meters'),
        capacity=data.get('capacity'),
        status=data.get('status', 'available'),
        client_id=data.get('client_id'),
        sale_value_uf=data.get('sale_value_uf', 0),
        billed_value_uf=data.get('billed_value_uf', 0),
        cost_uf=data.get('cost_uf', 0)
    )
    db.add(office)
    db.commit()
    return db_to_dict(office)

@api_router.put("/offices/{office_id}")
def update_office(office_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    office = db.query(OfficeDB).filter(OfficeDB.id == office_id).first()
    if not office:
        raise HTTPException(status_code=404, detail="Oficina no encontrada")
    
    for key, value in data.items():
        if hasattr(office, key) and key != 'id':
            setattr(office, key, value)
    
    db.commit()
    return db_to_dict(office)

@api_router.delete("/offices/{office_id}")
def delete_office(office_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    office = db.query(OfficeDB).filter(OfficeDB.id == office_id).first()
    if not office:
        raise HTTPException(status_code=404, detail="Oficina no encontrada")
    
    db.delete(office)
    db.commit()
    return {"message": "Oficina eliminada"}

# ============ PARKING STORAGE ENDPOINTS ============

@api_router.get("/parking-storage")
def get_parking_storage(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    items = db.query(ParkingStorageDB).all()
    result = []
    for item in items:
        item_dict = db_to_dict(item)
        if item.client:
            item_dict['client_name'] = item.client.company_name
        result.append(item_dict)
    return result

@api_router.post("/parking-storage")
def create_parking_storage(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    item = ParkingStorageDB(
        id=str(uuid.uuid4()),
        number=data.get('number'),
        type=data.get('type', 'parking'),
        location=data.get('location'),
        status=data.get('status', 'available'),
        client_id=data.get('client_id'),
        sale_value_uf=data.get('sale_value_uf', 0),
        billed_value_uf=data.get('billed_value_uf', 0),
        cost_uf=data.get('cost_uf', 0)
    )
    db.add(item)
    db.commit()
    return db_to_dict(item)

@api_router.put("/parking-storage/{item_id}")
def update_parking_storage(item_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    item = db.query(ParkingStorageDB).filter(ParkingStorageDB.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    
    for key, value in data.items():
        if hasattr(item, key) and key != 'id':
            setattr(item, key, value)
    
    db.commit()
    return db_to_dict(item)

@api_router.delete("/parking-storage/{item_id}")
def delete_parking_storage(item_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    item = db.query(ParkingStorageDB).filter(ParkingStorageDB.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    
    db.delete(item)
    db.commit()
    return {"message": "Item eliminado"}

# ============ ROOMS ENDPOINTS ============

@api_router.get("/rooms")
def get_rooms(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    rooms = db.query(RoomDB).filter(RoomDB.status == 'active').all()
    return [db_to_dict(r) for r in rooms]

@api_router.post("/rooms")
def create_room(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    room = RoomDB(
        id=str(uuid.uuid4()),
        name=data.get('name'),
        capacity=data.get('capacity'),
        hourly_rate=data.get('hourly_rate', 0),
        half_day_rate=data.get('half_day_rate', 0),
        full_day_rate=data.get('full_day_rate', 0),
        amenities=data.get('amenities'),
        color=data.get('color'),
        blocks_rooms=data.get('blocks_rooms'),
        related_rooms=data.get('related_rooms')
    )
    db.add(room)
    db.commit()
    return db_to_dict(room)

@api_router.put("/rooms/{room_id}")
def update_room(room_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    room = db.query(RoomDB).filter(RoomDB.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    
    for key, value in data.items():
        if hasattr(room, key) and key != 'id':
            setattr(room, key, value)
    
    db.commit()
    return db_to_dict(room)

@api_router.delete("/rooms/{room_id}")
def delete_room(room_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    room = db.query(RoomDB).filter(RoomDB.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    room.status = 'inactive'
    db.commit()
    return {"message": "Sala eliminada"}

# ============ BOOTHS ENDPOINTS ============

@api_router.get("/booths")
def get_booths(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    booths = db.query(BoothDB).filter(BoothDB.status == 'active').all()
    return [db_to_dict(b) for b in booths]

@api_router.post("/booths")
def create_booth(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    booth = BoothDB(
        id=str(uuid.uuid4()),
        name=data.get('name'),
        hourly_rate=data.get('hourly_rate', 0),
        half_day_rate=data.get('half_day_rate', 0),
        full_day_rate=data.get('full_day_rate', 0),
        color=data.get('color')
    )
    db.add(booth)
    db.commit()
    return db_to_dict(booth)

@api_router.put("/booths/{booth_id}")
def update_booth(booth_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    booth = db.query(BoothDB).filter(BoothDB.id == booth_id).first()
    if not booth:
        raise HTTPException(status_code=404, detail="Caseta no encontrada")
    
    for key, value in data.items():
        if hasattr(booth, key) and key != 'id':
            setattr(booth, key, value)
    
    db.commit()
    return db_to_dict(booth)

# ============ BOOKINGS ENDPOINTS ============

@api_router.get("/bookings")
def get_bookings(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    bookings = db.query(BookingDB).all()
    return [db_to_dict(b) for b in bookings]

@api_router.post("/bookings")
def create_booking(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    booking = BookingDB(
        id=str(uuid.uuid4()),
        resource_type=data.get('resource_type'),
        resource_id=data.get('resource_id'),
        resource_name=data.get('resource_name'),
        client_id=data.get('client_id'),
        client_name=data.get('client_name'),
        date=data.get('date'),
        start_time=data.get('start_time'),
        end_time=data.get('end_time'),
        status=data.get('status', 'pending'),
        total_price=data.get('total_price', 0),
        notes=data.get('notes')
    )
    db.add(booking)
    db.commit()
    return db_to_dict(booking)

@api_router.put("/bookings/{booking_id}")
def update_booking(booking_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    booking = db.query(BookingDB).filter(BookingDB.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    for key, value in data.items():
        if hasattr(booking, key) and key != 'id':
            setattr(booking, key, value)
    
    db.commit()
    return db_to_dict(booking)

@api_router.delete("/bookings/{booking_id}")
def delete_booking(booking_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    booking = db.query(BookingDB).filter(BookingDB.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    db.delete(booking)
    db.commit()
    return {"message": "Reserva eliminada"}

# ============ PRODUCTS ENDPOINTS ============

@api_router.get("/products")
def get_products(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    products = db.query(ProductDB).filter(ProductDB.is_active == True).all()
    return [db_to_dict(p) for p in products]

@api_router.post("/products")
def create_product(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    product = ProductDB(
        id=str(uuid.uuid4()),
        name=data.get('name'),
        description=data.get('description'),
        category_id=data.get('category_id'),
        base_price=data.get('base_price', 0),
        unit=data.get('unit')
    )
    db.add(product)
    db.commit()
    return db_to_dict(product)

@api_router.put("/products/{product_id}")
def update_product(product_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    for key, value in data.items():
        if hasattr(product, key) and key != 'id':
            setattr(product, key, value)
    
    db.commit()
    return db_to_dict(product)

@api_router.delete("/products/{product_id}")
def delete_product(product_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    product.is_active = False
    db.commit()
    return {"message": "Producto eliminado"}

# ============ CATEGORIES ENDPOINTS ============

@api_router.get("/categories")
def get_categories(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    categories = db.query(CategoryDB).all()
    return [db_to_dict(c) for c in categories]

@api_router.post("/categories")
def create_category(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    category = CategoryDB(
        id=str(uuid.uuid4()),
        name=data.get('name'),
        description=data.get('description'),
        parent_id=data.get('parent_id')
    )
    db.add(category)
    db.commit()
    return db_to_dict(category)

# ============ MONTHLY SERVICES ENDPOINTS ============

@api_router.get("/monthly-services")
def get_monthly_services(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    services = db.query(MonthlyServiceDB).all()
    result = []
    for service in services:
        service_dict = db_to_dict(service)
        if service.client:
            service_dict['client_name'] = service.client.company_name
        result.append(service_dict)
    return result

@api_router.post("/monthly-services")
def create_monthly_service(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    service = MonthlyServiceDB(
        id=str(uuid.uuid4()),
        service_name=data.get('service_name'),
        category=data.get('category'),
        client_id=data.get('client_id'),
        sale_value_uf=data.get('sale_value_uf', 0),
        billed_value_uf=data.get('billed_value_uf', 0),
        cost_uf=data.get('cost_uf', 0),
        status=data.get('status', 'active'),
        start_date=data.get('start_date'),
        notes=data.get('notes')
    )
    db.add(service)
    db.commit()
    return db_to_dict(service)

@api_router.put("/monthly-services/{service_id}")
def update_monthly_service(service_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    service = db.query(MonthlyServiceDB).filter(MonthlyServiceDB.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    for key, value in data.items():
        if hasattr(service, key) and key != 'id':
            setattr(service, key, value)
    
    db.commit()
    return db_to_dict(service)

@api_router.delete("/monthly-services/{service_id}")
def delete_monthly_service(service_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    service = db.query(MonthlyServiceDB).filter(MonthlyServiceDB.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    db.delete(service)
    db.commit()
    return {"message": "Servicio eliminado"}

@api_router.get("/monthly-services-catalog")
def get_monthly_services_catalog(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    catalog = db.query(MonthlyServiceCatalogDB).filter(MonthlyServiceCatalogDB.is_active == True).all()
    return [db_to_dict(c) for c in catalog]

# ============ TICKETS ENDPOINTS ============
# NOTA: Los endpoints de tickets están deshabilitados porque la tabla 'tickets' no existe en la BD

@api_router.get("/tickets")
def get_tickets(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    # La tabla tickets no existe en la base de datos
    return []

# @api_router.post("/tickets")
# def create_ticket(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
#     ticket = TicketDB(
#         id=str(uuid.uuid4()),
#         ticket_number=data.get('ticket_number', f"TKT-{datetime.now().strftime('%Y%m%d%H%M%S')}"),
#         client_id=data.get('client_id'),
#         client_name=data.get('client_name'),
#         status=data.get('status', 'pending'),
#         payment_status=data.get('payment_status', 'pending'),
#         subtotal=data.get('subtotal', 0),
#         tax=data.get('tax', 0),
#         total=data.get('total', 0),
#         notes=data.get('notes'),
#         comisionista_id=data.get('comisionista_id'),
#         created_by=current_user.id
#     )
#     db.add(ticket)
#
#     # Add items
#     for item_data in data.get('items', []):
#         item = TicketItemDB(
#             id=str(uuid.uuid4()),
#             ticket_id=ticket.id,
#             product_id=item_data.get('product_id'),
#             product_name=item_data.get('product_name'),
#             description=item_data.get('description'),
#             quantity=item_data.get('quantity', 1),
#             unit_price=item_data.get('unit_price', 0),
#             total=item_data.get('total', 0)
#         )
#         db.add(item)
#
#     db.commit()
#
#     ticket_dict = db_to_dict(ticket)
#     ticket_dict['items'] = [db_to_dict(i) for i in ticket.items]
#     return ticket_dict

# @api_router.put("/tickets/{ticket_id}")
# def update_ticket(ticket_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
#     ticket = db.query(TicketDB).filter(TicketDB.id == ticket_id).first()
#     if not ticket:
#         raise HTTPException(status_code=404, detail="Ticket no encontrado")
#
#     for key, value in data.items():
#         if hasattr(ticket, key) and key not in ['id', 'items']:
#             setattr(ticket, key, value)
#
#     db.commit()
#     return db_to_dict(ticket)

# ============ REQUESTS ENDPOINTS ============

@api_router.get("/requests")
def get_requests(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    requests = db.query(RequestDB).order_by(RequestDB.created_at.desc()).all()
    return [db_to_dict(r) for r in requests]

@api_router.post("/requests")
def create_request(data: dict, db: Session = Depends(get_db)):
    request = RequestDB(
        id=str(uuid.uuid4()),
        type=data.get('type', 'contact'),
        name=data.get('name'),
        email=data.get('email'),
        phone=data.get('phone'),
        company=data.get('company'),
        message=data.get('message'),
        source=data.get('source'),
        status='new'
    )
    db.add(request)
    db.commit()
    return db_to_dict(request)

@api_router.put("/requests/{request_id}")
def update_request(request_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    request = db.query(RequestDB).filter(RequestDB.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    for key, value in data.items():
        if hasattr(request, key) and key != 'id':
            setattr(request, key, value)
    
    db.commit()
    return db_to_dict(request)

@api_router.get("/requests/count")
def get_requests_count(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    count = db.query(RequestDB).filter(RequestDB.status == 'new').count()
    return {"count": count}

# ============ QUOTES ENDPOINTS ============

@api_router.get("/quotes")
def get_quotes(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    quotes = db.query(QuoteDB).all()
    result = []
    for quote in quotes:
        quote_dict = db_to_dict(quote)
        # items ya es un array JSON, no necesita conversión
        # quote_dict['items'] ya está incluido por db_to_dict()
        result.append(quote_dict)
    return result

@api_router.post("/quotes")
def create_quote(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    # Los items se almacenan como JSON en la columna 'items'
    items_data = data.get('items', [])

    quote = QuoteDB(
        id=str(uuid.uuid4()),
        quote_number=data.get('quote_number', f"COT-{datetime.now().strftime('%Y%m%d%H%M%S')}"),
        client_name=data.get('client_name'),
        client_email=data.get('client_email'),
        client_phone=data.get('client_phone'),
        company_name=data.get('client_company') or data.get('company_name'),  # Soporta ambos nombres por compatibilidad
        items=items_data,  # Guardar items como JSON
        status=data.get('status', 'draft'),
        valid_until=data.get('valid_until'),
        subtotal=data.get('subtotal', 0),
        tax=data.get('tax', 0),
        total=data.get('total', 0),
        notes=data.get('notes'),
        created_by=current_user.id
    )
    db.add(quote)
    db.commit()

    quote_dict = db_to_dict(quote)
    return quote_dict

@api_router.get("/quotes/pending/count")
def get_pending_quotes_count(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    count = db.query(QuoteDB).filter(QuoteDB.status == 'draft').count()
    return {"count": count}

# ============ DASHBOARD STATS ============

@api_router.get("/stats/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    total_clients = db.query(ClientDB).filter(ClientDB.is_active == True).count()
    total_offices = db.query(OfficeDB).count()
    occupied_offices = db.query(OfficeDB).filter(OfficeDB.status == 'occupied').count()
    available_offices = db.query(OfficeDB).filter(OfficeDB.status == 'available').count()
    
    total_income = db.query(OfficeDB).with_entities(
        db.query(OfficeDB).with_entities(OfficeDB.billed_value_uf).all()
    )
    
    return {
        "total_clients": total_clients,
        "total_offices": total_offices,
        "occupied_offices": occupied_offices,
        "available_offices": available_offices,
        "occupancy_rate": round((occupied_offices / total_offices * 100) if total_offices > 0 else 0, 1)
    }

# ============ FLOOR PLAN ============

@api_router.get("/floor-plan-coordinates")
def get_floor_plan_coordinates(db: Session = Depends(get_db)):
    coords = db.query(FloorPlanCoordinateDB).all()
    return {"coordinates": {c.office_number: db_to_dict(c) for c in coords}}

@api_router.post("/floor-plan-coordinates")
def save_floor_plan_coordinates(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    # Clear existing
    db.query(FloorPlanCoordinateDB).delete()
    
    for office_num, coord in data.get('coordinates', {}).items():
        new_coord = FloorPlanCoordinateDB(
            id=str(uuid.uuid4()),
            office_number=office_num,
            x=coord.get('x'),
            y=coord.get('y'),
            width=coord.get('width'),
            height=coord.get('height')
        )
        db.add(new_coord)
    
    db.commit()
    return {"message": "Coordenadas guardadas"}

# ============ COMISIONISTAS ============

@api_router.get("/comisionistas")
def get_comisionistas(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    comisionistas = db.query(UserDB).filter(UserDB.role == 'comisionista').all()
    return [db_to_dict(c, exclude=['password']) for c in comisionistas]

# ============ SALES ============

@api_router.get("/sales")
def get_sales(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    sales = db.query(SaleDB).all()
    return [db_to_dict(s) for s in sales]

# ============ PUBLIC ENDPOINTS ============

@api_router.get("/public/offices")
def get_public_offices(db: Session = Depends(get_db)):
    offices = db.query(OfficeDB).all()
    return [db_to_dict(o) for o in offices]

# ============ SEED PROFILES ============

@api_router.post("/seed-profiles")
def seed_profiles(db: Session = Depends(get_db)):
    existing = db.query(ProfileDB).count()
    if existing > 0:
        return {"message": "Perfiles ya existen"}
    
    admin_profile = ProfileDB(
        id=str(uuid.uuid4()),
        name="ADMIN",
        description="Administrador con acceso total",
        allowed_modules=AVAILABLE_MODULES,
        is_system=True
    )
    
    receptionist_profile = ProfileDB(
        id=str(uuid.uuid4()),
        name="Recepcionista",
        description="Acceso a módulos de atención",
        allowed_modules=["dashboard", "resources", "requests", "tickets", "clients"],
        is_system=False
    )
    
    db.add(admin_profile)
    db.add(receptionist_profile)
    db.commit()
    
    # Update admin user
    admin_user = db.query(UserDB).filter(UserDB.role == 'admin').first()
    if admin_user:
        admin_user.profile_id = admin_profile.id
        db.commit()
    
    return {"message": "Perfiles creados", "profiles": [admin_profile.name, receptionist_profile.name]}

# ============ CLIENT CONTACTS & DOCUMENTS ============

@api_router.post("/clients/{client_id}/contacts")
def add_client_contact(client_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Update client with additional contact if needed
    contacts = data.get('contacts', [])
    # For now, we'll store in notes since we don't have a separate contacts table
    return {"message": "Contacto añadido"}

@api_router.post("/clients/{client_id}/documents")
def add_client_document(client_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    doc = ClientDocumentDB(
        id=str(uuid.uuid4()),
        client_id=client_id,
        name=data.get('name'),
        file_url=data.get('file_url'),
        document_type=data.get('document_type'),
        expiry_date=data.get('expiry_date'),
        notifications_enabled=data.get('notifications_enabled', False),
        notification_days=data.get('notification_days', 30)
    )
    db.add(doc)
    db.commit()
    return db_to_dict(doc)

@api_router.put("/clients/{client_id}/documents/{document_id}")
def update_client_document(client_id: str, document_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    doc = db.query(ClientDocumentDB).filter(ClientDocumentDB.id == document_id, ClientDocumentDB.client_id == client_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    for key, value in data.items():
        if hasattr(doc, key) and key != 'id':
            setattr(doc, key, value)
    
    db.commit()
    return db_to_dict(doc)

@api_router.delete("/clients/{client_id}/documents/{document_id}")
def delete_client_document(client_id: str, document_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    doc = db.query(ClientDocumentDB).filter(ClientDocumentDB.id == document_id, ClientDocumentDB.client_id == client_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    db.delete(doc)
    db.commit()
    return {"message": "Documento eliminado"}

# ============ CONTRACTS EXPIRING SOON ============

@api_router.get("/contracts/expiring-soon")
def get_expiring_contracts(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    from datetime import date
    today = date.today()
    threshold = today + timedelta(days=30)
    
    expiring = []
    
    # Check offices
    offices = db.query(OfficeDB).filter(
        OfficeDB.contract_end != None,
        OfficeDB.contract_end <= threshold,
        OfficeDB.contract_end >= today
    ).all()
    
    for office in offices:
        client_name = office.client.company_name if office.client else "Sin cliente"
        expiring.append({
            "type": "office",
            "id": office.id,
            "name": f"Oficina {office.office_number}",
            "client_name": client_name,
            "expiry_date": office.contract_end.isoformat() if office.contract_end else None,
            "days_remaining": (office.contract_end - today).days if office.contract_end else 0
        })
    
    # Check client documents
    documents = db.query(ClientDocumentDB).filter(
        ClientDocumentDB.expiry_date != None,
        ClientDocumentDB.expiry_date <= threshold,
        ClientDocumentDB.expiry_date >= today,
        ClientDocumentDB.notifications_enabled == True
    ).all()
    
    for doc in documents:
        client_name = doc.client.company_name if doc.client else "Sin cliente"
        expiring.append({
            "type": "document",
            "id": doc.id,
            "name": doc.name,
            "client_name": client_name,
            "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
            "days_remaining": (doc.expiry_date - today).days if doc.expiry_date else 0
        })
    
    return sorted(expiring, key=lambda x: x.get('days_remaining', 999))

# ============ INVOICES ============

@api_router.get("/invoices")
def get_invoices(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    invoices = db.query(InvoiceDB).all()
    return [db_to_dict(i) for i in invoices]

@api_router.get("/invoices/pending")
def get_pending_invoices(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    invoices = db.query(InvoiceDB).filter(InvoiceDB.status.in_(['draft', 'sent'])).all()
    return [db_to_dict(i) for i in invoices]

@api_router.post("/invoices")
def create_invoice(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    invoice = InvoiceDB(
        id=str(uuid.uuid4()),
        invoice_number=data.get('invoice_number', f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}"),
        ticket_id=data.get('ticket_id'),
        client_id=data.get('client_id'),
        issue_date=data.get('issue_date'),
        due_date=data.get('due_date'),
        subtotal=data.get('subtotal', 0),
        tax=data.get('tax', 0),
        total=data.get('total', 0),
        status=data.get('status', 'draft'),
        notes=data.get('notes')
    )
    db.add(invoice)
    db.commit()
    return db_to_dict(invoice)

@api_router.put("/invoices/{invoice_id}/status")
def update_invoice_status(invoice_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    invoice = db.query(InvoiceDB).filter(InvoiceDB.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    invoice.status = data.get('status', invoice.status)
    db.commit()
    return db_to_dict(invoice)

# ============ DASHBOARD STATS COMPLETE ============

@api_router.get("/dashboard/stats")
def get_dashboard_stats_full(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    from sqlalchemy import func
    
    total_clients = db.query(ClientDB).filter(ClientDB.is_active == True).count()
    total_offices = db.query(OfficeDB).count()
    occupied_offices = db.query(OfficeDB).filter(OfficeDB.status == 'occupied').count()
    available_offices = db.query(OfficeDB).filter(OfficeDB.status == 'available').count()
    
    # Calculate total income from offices
    total_billed = db.query(func.sum(OfficeDB.billed_value_uf)).scalar() or 0
    total_cost = db.query(func.sum(OfficeDB.cost_uf)).scalar() or 0
    
    # Parking/Storage stats
    total_parking = db.query(ParkingStorageDB).filter(ParkingStorageDB.type == 'parking').count()
    occupied_parking = db.query(ParkingStorageDB).filter(ParkingStorageDB.type == 'parking', ParkingStorageDB.status == 'occupied').count()
    total_storage = db.query(ParkingStorageDB).filter(ParkingStorageDB.type == 'storage').count()
    occupied_storage = db.query(ParkingStorageDB).filter(ParkingStorageDB.type == 'storage', ParkingStorageDB.status == 'occupied').count()
    
    # Pending requests
    new_requests = db.query(RequestDB).filter(RequestDB.status == 'new').count()
    
    # Pending quotes
    pending_quotes = db.query(QuoteDB).filter(QuoteDB.status == 'draft').count()
    
    return {
        "total_clients": total_clients,
        "total_offices": total_offices,
        "occupied_offices": occupied_offices,
        "available_offices": available_offices,
        "occupancy_rate": round((occupied_offices / total_offices * 100) if total_offices > 0 else 0, 1),
        "total_billed_uf": float(total_billed),
        "total_cost_uf": float(total_cost),
        "margin_uf": float(total_billed - total_cost),
        "total_parking": total_parking,
        "occupied_parking": occupied_parking,
        "total_storage": total_storage,
        "occupied_storage": occupied_storage,
        "new_requests": new_requests,
        "pending_quotes": pending_quotes
    }

# ============ QUOTES PUBLIC ============

@api_router.post("/quotes/public")
def create_public_quote(data: dict, db: Session = Depends(get_db)):
    quote = QuoteDB(
        id=str(uuid.uuid4()),
        quote_number=f"PRE-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        client_name=data.get('client_name'),
        client_email=data.get('client_email'),
        client_phone=data.get('client_phone'),
        client_company=data.get('client_company'),
        status='pre-cotizacion',
        notes=data.get('message')
    )
    db.add(quote)
    
    # Also create a request entry
    request = RequestDB(
        id=str(uuid.uuid4()),
        type='quote',
        name=data.get('client_name'),
        email=data.get('client_email'),
        phone=data.get('client_phone'),
        company=data.get('client_company'),
        message=data.get('message'),
        source='fanpage',
        status='new'
    )
    db.add(request)
    
    db.commit()
    return db_to_dict(quote)

@api_router.get("/quotes/pending-count")
def get_pending_quotes_count_alt(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    count = db.query(QuoteDB).filter(QuoteDB.status.in_(['draft', 'pre-cotizacion'])).count()
    return {"count": count}

@api_router.get("/quotes/{quote_id}")
def get_quote(quote_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    quote = db.query(QuoteDB).filter(QuoteDB.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    quote_dict = db_to_dict(quote)
    # items ya es un array JSON, no necesita conversión
    return quote_dict

@api_router.put("/quotes/{quote_id}")
def update_quote(quote_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    quote = db.query(QuoteDB).filter(QuoteDB.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    for key, value in data.items():
        if hasattr(quote, key) and key not in ['id']:
            # items se almacena como JSON directamente
            setattr(quote, key, value)

    db.commit()
    return db_to_dict(quote)

@api_router.delete("/quotes/{quote_id}")
def delete_quote(quote_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    quote = db.query(QuoteDB).filter(QuoteDB.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    
    db.delete(quote)
    db.commit()
    return {"message": "Cotización eliminada"}

# ============ TEMPLATES ============

@api_router.get("/templates")
def get_templates(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    templates = db.query(QuoteTemplateDB).all()
    return [db_to_dict(t) for t in templates]

@api_router.post("/templates")
def create_template(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    template = QuoteTemplateDB(
        id=str(uuid.uuid4()),
        name=data.get('name'),
        content=data.get('content'),
        variables=data.get('variables'),
        is_default=data.get('is_default', False)
    )
    db.add(template)
    db.commit()
    return db_to_dict(template)

@api_router.get("/templates/{template_id}")
def get_template(template_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    template = db.query(QuoteTemplateDB).filter(QuoteTemplateDB.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return db_to_dict(template)

@api_router.put("/templates/{template_id}")
def update_template(template_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    template = db.query(QuoteTemplateDB).filter(QuoteTemplateDB.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    
    for key, value in data.items():
        if hasattr(template, key) and key != 'id':
            setattr(template, key, value)
    
    db.commit()
    return db_to_dict(template)

@api_router.delete("/templates/{template_id}")
def delete_template(template_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    template = db.query(QuoteTemplateDB).filter(QuoteTemplateDB.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    
    db.delete(template)
    db.commit()
    return {"message": "Plantilla eliminada"}

# ============ OFFICES PUBLIC ============

@api_router.get("/offices/public/all")
def get_public_offices_all(db: Session = Depends(get_db)):
    offices = db.query(OfficeDB).all()
    return [db_to_dict(o) for o in offices]

# ============ FLOOR PLAN LEGACY ============

@api_router.get("/floor-plan/coordinates")
def get_floor_plan_coords_legacy(db: Session = Depends(get_db)):
    coords = db.query(FloorPlanCoordinateDB).all()
    return {"coordinates": {c.office_number: db_to_dict(c) for c in coords}}

@api_router.post("/floor-plan/coordinates")
def save_floor_plan_coords_legacy(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    db.query(FloorPlanCoordinateDB).delete()
    
    for office_num, coord in data.get('coordinates', {}).items():
        new_coord = FloorPlanCoordinateDB(
            id=str(uuid.uuid4()),
            office_number=office_num,
            x=coord.get('x'),
            y=coord.get('y'),
            width=coord.get('width'),
            height=coord.get('height')
        )
        db.add(new_coord)
    
    db.commit()
    return {"message": "Coordenadas guardadas"}

# ============ CATEGORIES PUBLIC ============

@api_router.get("/categories/public")
def get_public_categories(db: Session = Depends(get_db)):
    categories = db.query(CategoryDB).all()
    return [db_to_dict(c) for c in categories]

@api_router.get("/products/public")
def get_public_products(db: Session = Depends(get_db)):
    products = db.query(ProductDB).filter(ProductDB.is_active == True).all()
    return [db_to_dict(p) for p in products]

# ============ BOOKINGS PUBLIC ============

@api_router.get("/bookings/public/{resource_type}/{resource_id}")
def get_public_bookings(resource_type: str, resource_id: str, db: Session = Depends(get_db)):
    bookings = db.query(BookingDB).filter(
        BookingDB.resource_type == resource_type,
        BookingDB.resource_id == resource_id,
        BookingDB.status != 'cancelled'
    ).all()
    return [db_to_dict(b) for b in bookings]

# ============ SEED DATA ============

@api_router.post("/seed")
def seed_database(db: Session = Depends(get_db)):
    # Seed profiles if not exist
    existing_profiles = db.query(ProfileDB).count()
    if existing_profiles == 0:
        admin_profile = ProfileDB(
            id=str(uuid.uuid4()),
            name="ADMIN",
            description="Administrador con acceso total",
            allowed_modules=AVAILABLE_MODULES,
            is_system=True
        )
        receptionist_profile = ProfileDB(
            id=str(uuid.uuid4()),
            name="Recepcionista",
            description="Acceso a módulos de atención",
            allowed_modules=["dashboard", "resources", "requests", "tickets", "clients"],
            is_system=False
        )
        db.add(admin_profile)
        db.add(receptionist_profile)
        db.commit()
    
    # Seed admin user if not exist
    existing_admin = db.query(UserDB).filter(UserDB.email == 'admin@tnaoffice.cl').first()
    if not existing_admin:
        admin_profile = db.query(ProfileDB).filter(ProfileDB.name == 'ADMIN').first()
        admin_user = UserDB(
            id=str(uuid.uuid4()),
            email='admin@tnaoffice.cl',
            password=get_password_hash('admin123'),
            name='Administrador',
            role='admin',
            profile_id=admin_profile.id if admin_profile else None
        )
        db.add(admin_user)
        db.commit()
    
    return {"message": "Base de datos inicializada"}

# ============ REGISTER ROUTER ============

app.include_router(api_router)

# ============ HEALTH CHECK ============

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "MariaDB"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
