import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import TicketQueuePage from './pages/TicketQueuePage';
import UsersPage from './pages/UsersPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TicketQueuePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>
    </Routes>
  );
}

export default App;
