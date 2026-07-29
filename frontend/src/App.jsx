import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import StudentDashboard from './pages/StudentDashboard.jsx';
import PlacementCellDashboard from './pages/PlacementCellDashboard.jsx';
import RecruiterDashboard from './pages/RecruiterDashboard.jsx';
import Login from './pages/Login.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
        <Link to="/" style={{ marginRight: '1rem' }}>Login</Link>
        <Link to="/student" style={{ marginRight: '1rem' }}>Student</Link>
        <Link to="/placement-cell" style={{ marginRight: '1rem' }}>Placement cell</Link>
        <Link to="/recruiter">Recruiter</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/placement-cell" element={<PlacementCellDashboard />} />
        <Route path="/recruiter" element={<RecruiterDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
