'use client';

import { useAuth } from '@/context/auth.context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/reset'];

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      const isPublicPath = PUBLIC_PATHS.includes(pathname);
      
      if (!user && !isPublicPath) {
        router.push('/auth/login');
      } else if (user && isPublicPath) {
        router.push('/');
      }
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // To prevent flickering when redirecting or showing login form when already logged in
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  
  if (!user && !isPublicPath) {
    return null; // Redirecting to login
  }

  if (user && isPublicPath) {
    // If logged in but on a public path, show loader while redirecting to '/'
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return <>{children}</>;
};
