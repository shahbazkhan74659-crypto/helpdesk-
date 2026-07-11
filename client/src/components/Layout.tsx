import { Rows3 } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import { authClient } from '../lib/auth-client';
import { Role } from '../lib/role';

function Layout() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user.role === Role.admin;

  async function handleSignOut() {
    await authClient.signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-sidebar-border bg-sidebar">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <span className="flex items-center gap-2 font-heading font-semibold text-sidebar-foreground">
            <Rows3 className="size-5 text-sidebar-primary" />
            HelpDesk
          </span>
          <nav className="flex gap-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `text-sm ${isActive ? 'font-medium text-sidebar-primary' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/tickets"
              className={({ isActive }) =>
                `text-sm ${isActive ? 'font-medium text-sidebar-primary' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'}`
              }
            >
              Tickets
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/users"
                className={({ isActive }) =>
                  `text-sm ${isActive ? 'font-medium text-sidebar-primary' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'}`
                }
              >
                Users
              </NavLink>
            )}
          </nav>
          {session?.user && (
            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle />
              <span className="text-sm text-sidebar-foreground/80">{session.user.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                Sign out
              </Button>
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
