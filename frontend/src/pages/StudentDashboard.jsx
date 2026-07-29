import { useEffect, useState } from 'react';
import { getJobPostings } from '../api/client.js';

export default function StudentDashboard() {
  const [postings, setPostings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getJobPostings()
      .then(setPostings)
      .catch(() => setError('Backend /postings endpoint not implemented yet'));
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Student dashboard</h2>
      <p>Upload your resume and see match scores against active postings.</p>

      {/* TODO: resume upload form calling uploadResume() from api/client.js */}

      {error && <p style={{ color: '#888' }}>{error}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Posting</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Match score</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Explanation</th>
          </tr>
        </thead>
        <tbody>
          {postings.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: '1rem 0', color: '#888' }}>
                No postings yet - connect the backend to see data here.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
