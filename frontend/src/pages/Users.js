import { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Plus, 
  Users as UsersIcon, 
  Edit, 
  Trash2, 
  Shield,
  User,
  Mail,
  Key,
  Check,
  X,
  Settings,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('users'); // 'users' o 'profiles'

  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'cliente',
    profile_id: '',
    commission_percentage: 0
  });

  const [profileForm, setProfileForm] = useState({
    name: '',
    description: '',
    allowed_modules: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, profilesRes, modulesRes] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/profiles'),
        apiClient.get('/modules')
      ]);
      setUsers(usersRes.data);
      setProfiles(profilesRes.data);
      setModules(modulesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      // Si no hay perfiles, intentar crearlos
      if (error.response?.status === 404 || profiles.length === 0) {
        try {
          await apiClient.post('/seed-profiles');
          const [profilesRes, modulesRes] = await Promise.all([
            apiClient.get('/profiles'),
            apiClient.get('/modules')
          ]);
          setProfiles(profilesRes.data);
          setModules(modulesRes.data);
        } catch (seedError) {
          console.error('Error seeding profiles:', seedError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // ========== USUARIOS ==========

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/auth/register', userForm);
      toast.success('Usuario creado exitosamente');
      setShowUserModal(false);
      resetUserForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear usuario');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const updateData = { ...userForm };
      if (!updateData.password) delete updateData.password;
      
      await apiClient.put(`/users/${editingUser.id}`, updateData);
      toast.success('Usuario actualizado');
      setShowUserModal(false);
      setEditingUser(null);
      resetUserForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar usuario');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await apiClient.delete(`/users/${userId}`);
      toast.success('Usuario eliminado');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar usuario');
    }
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
      profile_id: user.profile_id || '',
      commission_percentage: user.commission_percentage || 0
    });
    setShowUserModal(true);
  };

  const resetUserForm = () => {
    setUserForm({
      email: '',
      password: '',
      name: '',
      role: 'cliente',
      profile_id: '',
      commission_percentage: 0
    });
  };

  // ========== PERFILES ==========

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/profiles', profileForm);
      toast.success('Perfil creado exitosamente');
      setShowProfileModal(false);
      resetProfileForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear perfil');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/profiles/${editingProfile.id}`, profileForm);
      toast.success('Perfil actualizado');
      setShowProfileModal(false);
      setEditingProfile(null);
      resetProfileForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar perfil');
    }
  };

  const handleDeleteProfile = async (profileId) => {
    if (!window.confirm('¿Estás seguro de eliminar este perfil?')) return;
    try {
      await apiClient.delete(`/profiles/${profileId}`);
      toast.success('Perfil eliminado');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar perfil');
    }
  };

  const openEditProfile = (profile) => {
    setEditingProfile(profile);
    setProfileForm({
      name: profile.name,
      description: profile.description || '',
      allowed_modules: profile.allowed_modules || []
    });
    setShowProfileModal(true);
  };

  const resetProfileForm = () => {
    setProfileForm({
      name: '',
      description: '',
      allowed_modules: []
    });
  };

  const toggleModule = (moduleId) => {
    setProfileForm(prev => ({
      ...prev,
      allowed_modules: prev.allowed_modules.includes(moduleId)
        ? prev.allowed_modules.filter(m => m !== moduleId)
        : [...prev.allowed_modules, moduleId]
    }));
  };

  const getUsersCountByProfile = (profileId) => {
    return users.filter(u => u.profile_id === profileId).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-primary">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-secondary text-4xl md:text-5xl font-black uppercase text-black tracking-tight">
            USUARIOS Y PERFILES
          </h1>
          <div className="h-1 w-32 tna-gradient mt-4"></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-secondary uppercase text-sm transition-all ${
            activeTab === 'users'
              ? 'border-b-2 border-orange-500 text-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <UsersIcon className="w-4 h-4 inline mr-2" />
          Usuarios ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-4 py-2 font-secondary uppercase text-sm transition-all ${
            activeTab === 'profiles'
              ? 'border-b-2 border-orange-500 text-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          Perfiles ({profiles.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'users' ? (
        <div className="space-y-4">
          {/* Botón Nuevo Usuario */}
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingUser(null);
                resetUserForm();
                setShowUserModal(true);
              }}
              className="bg-gradient-to-r from-[#FF8A00] to-[#FF3D3D] hover:from-[#FF9A20] hover:to-[#FF5D5D] text-white rounded-sm font-bold uppercase tracking-wide font-secondary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </div>

          {/* Lista de Usuarios */}
          <Card className="bg-white border-gray-200 rounded-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-primary font-bold text-black">{user.name}</h3>
                        <p className="text-sm text-gray-500 font-primary">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded font-primary font-semibold ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700' 
                            : user.role === 'comisionista'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role.toUpperCase()}
                        </span>
                        {user.profile_name && (
                          <p className="text-xs text-gray-400 font-primary mt-1">
                            Perfil: {user.profile_name}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditUser(user)}
                          className="text-gray-500 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="p-8 text-center text-gray-500 font-primary">
                    No hay usuarios registrados
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Botón Nuevo Perfil */}
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingProfile(null);
                resetProfileForm();
                setShowProfileModal(true);
              }}
              className="bg-gradient-to-r from-[#FF8A00] to-[#FF3D3D] hover:from-[#FF9A20] hover:to-[#FF5D5D] text-white rounded-sm font-bold uppercase tracking-wide font-secondary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Perfil
            </Button>
          </div>

          {/* Lista de Perfiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <Card 
                key={profile.id} 
                className={`bg-white border-gray-200 rounded-sm ${
                  profile.is_system ? 'ring-2 ring-purple-200' : ''
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-secondary uppercase text-black flex items-center gap-2">
                      <Shield className={`w-5 h-5 ${profile.is_system ? 'text-purple-600' : 'text-orange-500'}`} />
                      {profile.name}
                    </CardTitle>
                    {!profile.is_system && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditProfile(profile)}
                          className="text-gray-500 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProfile(profile.id)}
                          className="text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {profile.is_system && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-primary">
                        Sistema
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 font-primary mb-3">
                    {profile.description || 'Sin descripción'}
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400 font-primary">
                      {getUsersCountByProfile(profile.id)} usuario(s)
                    </span>
                    <span className="text-xs text-gray-400 font-primary">
                      {profile.allowed_modules?.length || 0} módulo(s)
                    </span>
                  </div>
                  
                  {/* Módulos habilitados */}
                  <div className="flex flex-wrap gap-1">
                    {profile.allowed_modules?.slice(0, 5).map((moduleId) => {
                      const module = modules.find(m => m.id === moduleId);
                      return (
                        <span 
                          key={moduleId}
                          className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-primary"
                        >
                          {module?.name || moduleId}
                        </span>
                      );
                    })}
                    {profile.allowed_modules?.length > 5 && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-primary">
                        +{profile.allowed_modules.length - 5} más
                      </span>
                    )}
                  </div>
                  
                  {/* Botón para editar módulos */}
                  {!profile.is_system && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditProfile(profile)}
                      className="w-full mt-3 text-xs"
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Configurar Módulos
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal Usuario */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl flex items-center gap-2">
              <User className="w-5 h-5 text-orange-500" />
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4 mt-4">
            <div>
              <Label className="text-black font-primary font-medium">Nombre *</Label>
              <Input
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="Nombre completo"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Email *</Label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">
                Contraseña {editingUser ? '(dejar vacío para mantener)' : '*'}
              </Label>
              <Input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="••••••••"
                required={!editingUser}
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Rol</Label>
              <Select
                value={userForm.role}
                onValueChange={(value) => setUserForm({ ...userForm, role: value })}
              >
                <SelectTrigger className="bg-white border-gray-300 text-black">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="comisionista">Comisionista</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Perfil</Label>
              <Select
                value={userForm.profile_id}
                onValueChange={(value) => setUserForm({ ...userForm, profile_id: value })}
              >
                <SelectTrigger className="bg-white border-gray-300 text-black">
                  <SelectValue placeholder="Seleccionar perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin perfil</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {userForm.role === 'comisionista' && (
              <div>
                <Label className="text-black font-primary font-medium">% Comisión</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={userForm.commission_percentage}
                  onChange={(e) => setUserForm({ ...userForm, commission_percentage: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-black"
                />
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUserModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-[#FF8A00] to-[#FF3D3D] text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingUser ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Perfil */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              {editingProfile ? 'Editar Perfil' : 'Nuevo Perfil'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={editingProfile ? handleUpdateProfile : handleCreateProfile} className="space-y-4 mt-4">
            <div>
              <Label className="text-black font-primary font-medium">Nombre del Perfil *</Label>
              <Input
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="Ej: Recepcionista"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Descripción</Label>
              <Input
                value={profileForm.description}
                onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="Descripción del perfil"
              />
            </div>
            
            {/* Módulos */}
            <div>
              <Label className="text-black font-primary font-medium mb-2 block">
                Módulos Habilitados ({profileForm.allowed_modules.length})
              </Label>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto border border-gray-200 rounded-md p-3">
                {modules.map((module) => (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => toggleModule(module.id)}
                    className={`flex items-center gap-2 p-2 rounded-md text-left transition-all ${
                      profileForm.allowed_modules.includes(module.id)
                        ? 'bg-green-100 border-2 border-green-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${
                      profileForm.allowed_modules.includes(module.id)
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}>
                      {profileForm.allowed_modules.includes(module.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black font-primary">{module.name}</p>
                      <p className="text-xs text-gray-500">{module.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowProfileModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-[#FF8A00] to-[#FF3D3D] text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingProfile ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
