export default function PlacementCellDashboard() {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Placement cell dashboard</h2>
      <p>Manage job postings, set eligibility, view aggregate match analytics.</p>

      {/* TODO: 
        - form to create/approve job postings
        - table of postings with applicant counts and avg match score
        - calls to a future GET /postings and POST /postings endpoints
      */}
      <p style={{ color: '#888' }}>Connect the backend to see postings and analytics here.</p>
    </div>
  );
}
