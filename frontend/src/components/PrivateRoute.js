import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';

export const PrivateRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};