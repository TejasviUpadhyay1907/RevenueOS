import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

// Inner component — has access to AuthProvider context
function AppInner({ Component, pageProps }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const isAuthPage = router.pathname === '/login' || router.pathname === '/signup';
    if (!isAuthenticated && !isAuthPage) {
      router.replace('/login');
    } else if (isAuthenticated && isAuthPage) {
      router.replace('/');
    }
  }, [router.pathname, isAuthenticated]);

  return <Component {...pageProps} />;
}

// Outer wrapper — provides context
export default function App(props) {
  return (
    <AuthProvider>
      <AppInner {...props} />
    </AuthProvider>
  );
}
