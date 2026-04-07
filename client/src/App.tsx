import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout/DashboardLayout';
import PrivateRoute from './components/PrivateRoute/PrivateRoute';
import Dashboard from './pages/Dashboard/Dashboard';
import Activities from './pages/Activities/Activities';
import MoveItem from './pages/MoveItem/MoveItem';
import AddItem from './pages/AddItem/AddItem';
import Login from './pages/Login/Login';
import SetPassword from './pages/SetPassword/SetPassword';
import Users from './pages/Users/Users';
import Inventory from './pages/Inventory/Inventory';
import RemoveItemPage from './pages/TestPage/RemoveItemPage';
import Limbo from './pages/Limbo/Limbo';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/add-item" element={<AddItem />} />
                  <Route path="/move-item" element={<MoveItem />} />
                  <Route path="/remove-item" element={<RemoveItemPage />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/activity-log" element={<Activities />} />
                  <Route path="/limbo-items" element={<Limbo />} />
                </Routes>
              </DashboardLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
