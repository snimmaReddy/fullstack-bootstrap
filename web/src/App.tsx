import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ResourcePage } from './pages/ResourcePage';
import { resources } from './resources';

export default function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <NavLink to="/" end>Home</NavLink>
        {resources.map((r) => <NavLink key={r.key} to={`/${r.key}`}>{r.title}</NavLink>)}
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {resources.map((r) => (
            // key forces fresh state when switching between resource pages
            <Route key={r.key} path={`/${r.key}`} element={<ResourcePage key={r.key} config={r} />} />
          ))}
        </Routes>
      </main>
    </BrowserRouter>
  );
}
