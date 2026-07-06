import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAdmin from './components/RequireAdmin';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import UsersPage from './pages/UsersPage';

function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route
          path="users"
          element={
            <RequireAdmin>
              <UsersPage />
            </RequireAdmin>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
