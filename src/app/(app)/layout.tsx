
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
    <>
      <DynamicThemeStyles settings={themeSettings} />
      <SidebarProvider defaultOpen={false}>
        <Sidebar>
          <SideNav />
        </Sidebar>
        <SidebarInset>
          <Header />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
