import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout/DashboardLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import MoveItem from './pages/MoveItem/MoveItem';
import AddItem from './pages/AddItem/AddItem';
import './App.css';

function App() {
  return (
    <Router>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/add-item" element={<AddItem />} />
          <Route path="/move-item" element={<MoveItem />} />
          {/* Placeholder routes - these don't have to work yet */}
          <Route
            path="/inventory"
            element={<div style={{ padding: '2rem' }}>Inventory Page (Coming Soon)</div>}
          />
          <Route
            path="/activity-log"
            element={<div style={{ padding: '2rem' }}>Activity Log Page (Coming Soon)</div>}
          />
          <Route
            path="/limbo-items"
            element={<div style={{ padding: '2rem' }}>Limbo Items Page (Coming Soon)</div>}
          />
          <Route
            path="/analytics"
            element={<div style={{ padding: '2rem' }}>Analytics Page (Coming Soon)</div>}
          />
          <Route
            path="/settings"
            element={<div style={{ padding: '2rem' }}>Settings Page (Coming Soon)</div>}
          />
        </Routes>
      </DashboardLayout>
    </Router>
  );
}

export default App;
