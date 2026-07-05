import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Queue', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/knowledge-base', label: 'Knowledge Base' },
  { to: '/users', label: 'Users' },
];

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <span className="font-semibold text-gray-900">HelpDesk</span>
          <nav className="flex gap-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `text-sm ${isActive ? 'font-medium text-gray-900' : 'text-gray-500 hover:text-gray-900'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
