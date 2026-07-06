import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { authClient } from '../lib/auth-client';

const navItems = [
  { to: '/', label: 'Queue', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/knowledge-base', label: 'Knowledge Base' },
  { to: '/users', label: 'Users' },
];

function Layout() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-700 bg-gray-800">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <span className="font-semibold text-white">HelpDesk</span>
          <nav className="flex gap-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `text-sm ${isActive ? 'font-medium text-white' : 'text-gray-400 hover:text-white'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          {session?.user && (
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-gray-300">{session.user.name}</span>
              <button
                onClick={handleSignOut}
                className="rounded border border-gray-600 px-3 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
