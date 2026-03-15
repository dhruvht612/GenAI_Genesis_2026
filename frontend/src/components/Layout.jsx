import { Outlet, useLocation } from 'react-router-dom';
import Nav from './Nav';

export default function Layout() {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/') || location.pathname === '/doctor' || location.pathname.startsWith('/doctor/');

  return (
    <div className="app">
      {!isDashboard && <Nav />}
      <main className={isDashboard ? 'main-dashboard' : ''}>
        <Outlet />
      </main>
    </div>
  );
}
