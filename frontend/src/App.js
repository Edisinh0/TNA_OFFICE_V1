import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Login } from './pages/Login';
import { FanPage } from './pages/FanPage';
import { OfficesFanPage } from './pages/OfficesFanPage';
import { Dashboard } from './pages/Dashboard';
import { Resources } from './pages/Resources';
import { Products } from './pages/Products';
import { Comisionistas } from './pages/Comisionistas';
import { Tickets } from './pages/Tickets';
import { Requests } from './pages/Requests';
import { Reports } from './pages/Reports';
import { Clients } from './pages/Clients';
import { Offices } from './pages/Offices';
import { ParkingStorage } from './pages/ParkingStorage';
import { MonthlyServices } from './pages/MonthlyServices';
import { Quotes } from './pages/Quotes';
import { AllBookings } from './pages/AllBookings';
import { Users } from './pages/Users';
import { PrivateRoute } from './components/PrivateRoute';
import { Layout } from './components/Layout';
import { isAuthenticated, getUser } from './utils/auth';

function App() {
  const user = getUser();
  const isAuth = isAuthenticated();

  return (
    <div className="App">
      <Toaster position="top-right" theme="dark" />
      <BrowserRouter basename="/office">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<FanPage />} />
          <Route path="/oficinas" element={<OfficesFanPage />} />
          
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Layout><Dashboard /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/resources" element={
            <PrivateRoute>
              <Layout><Resources /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/products" element={
            <PrivateRoute>
              <Layout><Products /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/comisionistas" element={
            <PrivateRoute>
              <Layout><Comisionistas /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/tickets" element={
            <PrivateRoute>
              <Layout><Tickets /></Layout>
            </PrivateRoute>
          } />
          
          {/* Legacy route redirects */}
          <Route path="/sales" element={<Navigate to="/tickets" replace />} />
          <Route path="/parking" element={<Navigate to="/parking-storage" replace />} />
          
          <Route path="/requests" element={
            <PrivateRoute>
              <Layout><Requests /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/reports" element={
            <PrivateRoute>
              <Layout><Reports /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/clients" element={
            <PrivateRoute>
              <Layout><Clients /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/offices" element={
            <PrivateRoute>
              <Layout><Offices /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/parking-storage" element={
            <PrivateRoute>
              <Layout><ParkingStorage /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/monthly-services" element={
            <PrivateRoute>
              <Layout><MonthlyServices /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/quotes" element={
            <PrivateRoute>
              <Layout><Quotes /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/all-bookings" element={
            <PrivateRoute>
              <Layout><AllBookings /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/users" element={
            <PrivateRoute>
              <Layout><Users /></Layout>
            </PrivateRoute>
          } />

          {/* Catch-all: redirect unknown routes to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;