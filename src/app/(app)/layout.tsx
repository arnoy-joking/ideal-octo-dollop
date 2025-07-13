
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Header } from "@/components/dashboard/header";
import { SideNav } from "@/components/dashboard/side-nav";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { useUser } from "@/context/user-context";
import { Skeleton } from '@/components/ui/skeleton';
import type { ThemeSettings } from '@/lib/types';
import { getThemeSettingsAction } from '@/app/actions/theme-actions';

function DynamicThemeStyles({ settings }: { settings: ThemeSettings | null }) {
  if (!settings) return null;

  const generateThemeStyles = (themeName: string, themeConfig: ThemeSettings[string]) => {
    if (!themeConfig || !themeConfig.imageUrl) return '';
    return `
      html.${themeName} body {
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

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading } = useUser();
  const router = useRouter();
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
    }
    if (currentUser) {
      getThemeSettingsAction(currentUser.id).then(setThemeSettings);
    }
  }, [currentUser, isLoading, router]);
  
  if (isLoading || !currentUser) {
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
    <>
      <DynamicThemeStyles settings={themeSettings} />
      <SidebarProvider>
        <Sidebar>
          <SideNav />
        </Sidebar>
        <SidebarInset>
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-transparent">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}

    
