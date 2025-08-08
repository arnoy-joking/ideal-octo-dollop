
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from "@/components/dashboard/header";
import { SideNav } from "@/components/dashboard/side-nav";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { useUser } from "@/context/user-context";
import { Skeleton } from '@/components/ui/skeleton';
import type { ThemeSettings } from '@/lib/types';
import { getThemeSettingsAction } from '@/app/actions/theme-actions';
import { getPasswordAction, verifyPasswordAction } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, Loader2 } from 'lucide-react';

function DynamicThemeStyles({ settings }: { settings: ThemeSettings | null }) {
  if (!settings) return null;

  const generateThemeStyles = (themeName: string, themeConfig: ThemeSettings[keyof ThemeSettings]) => {
    if (!themeConfig || !themeConfig.imageUrl) return '';
    // CSS variables are defined here and will be used in globals.css
    return `
      html.${themeName} {
        --bg-image-url: url('${themeConfig.imageUrl}');
        --bg-opacity: ${themeConfig.opacity / 100};
        --bg-blur: blur(${themeConfig.blur}px);
      }
    `;
  };
  
  const styles = Object.entries(settings)
    .map(([themeName, themeConfig]) => generateThemeStyles(themeName, themeConfig))
    .join('\n');

  return <style>{styles}</style>;
}


function AuthGate({ children }: { children: React.ReactNode }) {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [hasPassword, setHasPassword] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const sessionUnlocked = sessionStorage.getItem('app_unlocked') === 'true';
            if (sessionUnlocked) {
                setIsUnlocked(true);
                setIsLoading(false);
                return;
            }

            const storedPassword = await getPasswordAction();
            if (storedPassword) {
                setHasPassword(true);
            } else {
                // No password is set, so the app is unlocked by default
                setIsUnlocked(true);
                sessionStorage.setItem('app_unlocked', 'true');
            }
            setIsLoading(false);
        };
        checkAuth();
    }, []);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const isValid = await verifyPasswordAction(password);
        if (isValid) {
            sessionStorage.setItem('app_unlocked', 'true');
            setIsUnlocked(true);
        } else {
            setError('Incorrect password. Please try again.');
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!isUnlocked && hasPassword) {
         return (
            <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <form onSubmit={handleUnlock}>
                        <CardHeader className="text-center">
                             <KeyRound className="mx-auto h-12 w-12 text-primary" />
                            <CardTitle>Authentication Required</CardTitle>
                            <CardDescription>
                                Please enter the application password to continue.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Input
                                id="app-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password..."
                                autoFocus
                            />
                            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full">Unlock</Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isInitialLoading } = useUser();
  const router = useRouter();
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);

  useEffect(() => {
    if (!isInitialLoading && !currentUser) {
      router.push('/login');
    }
    if (currentUser) {
      getThemeSettingsAction(currentUser.id).then(setThemeSettings);
    }
  }, [currentUser, isInitialLoading, router]);
  
  if (isInitialLoading || !currentUser) {
    return (
      <div className="flex min-h-screen w-full bg-background">
          <div className="hidden md:block border-r w-16 md:w-64 bg-sidebar">
               <Skeleton className="h-full w-full" />
          </div>
          <div className="flex-1 flex flex-col">
               <Skeleton className="h-16 w-full border-b" />
               <main className="flex-1 p-4 sm:p-6 lg:p-8">
                   <Skeleton className="h-96 w-full" />
               </main>
          </div>
      </div>
    );
  }

  return (
    <AuthGate>
      <DynamicThemeStyles settings={themeSettings} />
      <SidebarProvider>
        <Sidebar>
          <SideNav />
        </Sidebar>
        <SidebarInset>
          <Header />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </AuthGate>
  );
}
