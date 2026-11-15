import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resources } from '../resources';

export function HomePage() {
  const [health, setHealth] = useState('checking…');
  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((b) => setHealth(`connected to "${b.database}"`))
      .catch(() => setHealth('API or database unreachable'));
  }, []);

  return (
    <section>
      <h1>Upstart</h1>
      <p className="muted">Database: {health}</p>
      <ul>
        {resources.map((r) => <li key={r.key}><Link to={`/${r.key}`}>{r.title}</Link></li>)}
      </ul>
    </section>
  );
}
