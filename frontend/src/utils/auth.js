export const setToken = (token) => {
  localStorage.setItem('tna_token', token);
};

export const getToken = () => {
  return localStorage.getItem('tna_token');
};

export const removeToken = () => {
  localStorage.removeItem('tna_token');
};

export const setUser = (user) => {
  localStorage.setItem('tna_user', JSON.stringify(user));
};

export const getUser = () => {
  const user = localStorage.getItem('tna_user');
  return user ? JSON.parse(user) : null;
};

export const removeUser = () => {
  localStorage.removeItem('tna_user');
};

export const logout = () => {
  removeToken();
  removeUser();
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const getAuthHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};