import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { useSchemas } from './hooks/useSchemas';
import { HomePage } from './pages/HomePage';
import { ResourcePage } from './pages/ResourcePage';
import { resources as typedResources } from './resources';

export default function App() {
  const { resources: schemaResources, errors, loading, failed } = useSchemas();
  const resources = [...typedResources, ...schemaResources];

  return (
    <BrowserRouter>
      <nav className="nav">
        <NavLink to="/" end>Home</NavLink>
        {resources.map((r) => <NavLink key={r.key} to={`/${r.key}`}>{r.title}</NavLink>)}
      </nav>
      {import.meta.env.DEV && (failed || errors.length > 0) && (
        <div className="banner">
          {failed && <p>{failed}</p>}
          {errors.map((e) => <p key={e.file}><strong>{e.file}</strong>: {e.message}</p>)}
        </div>
      )}
      <main>
        <Routes>
          <Route path="/" element={<HomePage resources={resources} loading={loading} />} />
          {resources.map((r) => (
            // Re-mount when the schema changes so the form picks up new fields.
            <Route key={r.key} path={`/${r.key}`}
              element={<ResourcePage key={`${r.key}:${JSON.stringify(r.fields)}`} config={r} />} />
          ))}
          <Route path="*" element={<p className="muted">{loading ? 'Loading…' : 'Page not found.'}</p>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
