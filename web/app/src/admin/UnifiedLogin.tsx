import { LoginScreen } from '../components/LoginScreen';
import type { DemoUser } from '../lib/auth';

export function UnifiedLogin() {
  function handleLogin(user: DemoUser) {
    const hasKnowledgeAccess = user.role === 'ADMIN' || Boolean(user.knowledgeRole);
    window.location.assign(hasKnowledgeAccess ? '/admin/dashboard' : '/');
  }

  return <LoginScreen onLogin={handleLogin} />;
}
