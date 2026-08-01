import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SourcesListPage } from './pages/SourcesListPage';
import { SourceNewPage } from './pages/SourceNewPage';
import { SourceDetailLayout } from './pages/SourceDetailLayout';
import { SourceValidateStep } from './pages/SourceValidateStep';
import { SourcePublishStep } from './pages/SourcePublishStep';
import { SourceAskStep } from './pages/SourceAskStep';
import { AuditPage } from './pages/AuditPage';
import { UnansweredPage } from './pages/UnansweredPage';
import { AutomationProcessesListPage } from './pages/AutomationProcessesListPage';
import { AutomationProcessNewPage } from './pages/AutomationProcessNewPage';
import { AutomationProcessDetailLayout } from './pages/AutomationProcessDetailLayout';
import { AutomationSummaryTab } from './pages/AutomationSummaryTab';
import { AutomationStepsTab } from './pages/AutomationStepsTab';
import { AutomationFieldsTab } from './pages/AutomationFieldsTab';
import { AutomationRulesTab } from './pages/AutomationRulesTab';
import { AutomationTemplatesTab } from './pages/AutomationTemplatesTab';
import { AutomationChecklistTab } from './pages/AutomationChecklistTab';
import { AutomationLogsTab } from './pages/AutomationLogsTab';
import { TranslationCachePage } from './pages/TranslationCachePage';
import { getToken } from './lib/auth';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/knowledge" element={<SourcesListPage />} />
            <Route path="/knowledge/new" element={<SourceNewPage />} />
            <Route path="/knowledge/audit" element={<AuditPage />} />
            <Route path="/knowledge/unanswered" element={<UnansweredPage />} />
            <Route path="/translations/cache" element={<TranslationCachePage />} />
            <Route path="/knowledge/:sourceId" element={<SourceDetailLayout />}>
              <Route index element={<SourceValidateStep />} />
              <Route path="publicar" element={<SourcePublishStep />} />
              <Route path="preguntar" element={<SourceAskStep />} />
            </Route>
            <Route path="/automation" element={<AutomationProcessesListPage />} />
            <Route path="/automation/new" element={<AutomationProcessNewPage />} />
            <Route path="/automation/:processId" element={<AutomationProcessDetailLayout />}>
              <Route index element={<AutomationSummaryTab />} />
              <Route path="pasos" element={<AutomationStepsTab />} />
              <Route path="campos" element={<AutomationFieldsTab />} />
              <Route path="reglas" element={<AutomationRulesTab />} />
              <Route path="plantillas" element={<AutomationTemplatesTab />} />
              <Route path="checklist" element={<AutomationChecklistTab />} />
              <Route path="logs" element={<AutomationLogsTab />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
