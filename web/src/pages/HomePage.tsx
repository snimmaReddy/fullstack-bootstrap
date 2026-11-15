import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ResourceConfig } from '../types';

export function HomePage({ resources, loading }: { resources: ResourceConfig[]; loading: boolean }) {
  const [health, setHealth] = useState('checking…');
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json().then((b) => (r.ok ? `connected to "${b.database}"` : b.error ?? 'unavailable')))
      .catch(() => 'API unreachable')
      .then(setHealth);
  }, []);

  return (
    <section>
      <h1>Upstart</h1>
      <p className="muted">Database: {health}</p>
      {loading ? <p className="muted">Loading schemas…</p> : resources.length === 0 ? (
        <p className="muted">No schemas yet. Add a file to <code>schemas/</code>.</p>
      ) : (
        <ul>
          {resources.map((r) => <li key={r.key}><Link to={`/${r.key}`}>{r.title}</Link></li>)}
        </ul>
      )}
    </section>
  );
}
