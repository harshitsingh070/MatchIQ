export default function RecruiterDashboard() {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Recruiter dashboard</h2>
      <p>View ranked candidates per posting, with match explanations, and shortlist.</p>

      {/* TODO:
        - dropdown to select a job posting
        - table of candidates sorted by match score, using getMatchResults()
        - shortlist button per candidate
      */}
      <p style={{ color: '#888' }}>Connect the backend to see ranked candidates here.</p>
    </div>
  );
}
