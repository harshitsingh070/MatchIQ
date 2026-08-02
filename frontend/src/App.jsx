import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/tokens.css';
import AppHeader from './components/AppHeader.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import PlacementCellDashboard from './pages/PlacementCellDashboard.jsx';
import RecruiterDashboard from './pages/RecruiterDashboard.jsx';
import PostingCandidates from './pages/PostingCandidates.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AppHeader />

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/student"
          element={
            <RequireAuth role="STUDENT">
              <StudentDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/placement-cell"
          element={
            <RequireAuth role="PLACEMENT_CELL">
              <PlacementCellDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/recruiter"
          element={
            <RequireAuth role="RECRUITER">
              <RecruiterDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/recruiter/postings/:id/candidates"
          element={
            <RequireAuth role="RECRUITER">
              <PostingCandidates />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
