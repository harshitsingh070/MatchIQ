import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/tokens.css';
import AppHeader from './components/AppHeader.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import PlacementCellDashboard from './pages/PlacementCellDashboard.jsx';
import StudentsRegister from './pages/StudentsRegister.jsx';
import StudentDetail from './pages/StudentDetail.jsx';
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
          path="/placement-cell/students"
          element={
            <RequireAuth role="PLACEMENT_CELL">
              <StudentsRegister />
            </RequireAuth>
          }
        />
        <Route
          path="/placement-cell/students/:email"
          element={
            <RequireAuth role="PLACEMENT_CELL">
              <StudentDetail />
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
            <RequireAuth roles={['RECRUITER', 'PLACEMENT_CELL']}>
              <PostingCandidates />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
