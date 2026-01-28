import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout/DashboardLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import Activities from './pages/Activities/Activities';
import './App.css';

function App() {
  return (
    <Router>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Placeholder routes - these don't have to work yet */}
          <Route
            path="/inventory"
            element={<div style={{ padding: '2rem' }}>Inventory Page (Coming Soon)</div>}
          />
          <Route path="/activity-log" element={<Activities />} />
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
