
'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Header } from "@/components/dashboard/header";
import { SideNav } from "@/components/dashboard/side-nav";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { useUser } from "@/context/user-context";
import { Skeleton } from '@/components/ui/skeleton';
import type { ThemeSettings } from '@/lib/types';
import { getThemeSettingsAction } from '@/app/actions/theme-actions';

function DynamicThemeStyles({ settings }: { settings: ThemeSettings | null }) {
  const { theme } = useTheme();
  if (!settings) return null;

  const currentThemeSettings = settings[theme || ''] || { opacity: 50, blur: 4, imageUrl: '', radius: 0.5 };
  const opacityValue = (currentThemeSettings.opacity || 0) / 100;
  const blurValue = currentThemeSettings.blur || 0;
  const radiusValue = currentThemeSettings.radius || 0.5;

  const generateColorStyles = (colors: Record<string, string> | undefined) => {
    if (!colors) return '';
    return Object.entries(colors)
      .map(([colorName, value]) => `        --${colorName}: ${value};`)
      .join('\n');
  };

  const styles = Object.entries(settings)
    .map(([themeName, themeConfig]) => {
      if (!themeConfig || !themeConfig.colors) return '';
      return `
        .${themeName.replace(/ /g, '-')} {
          ${generateColorStyles(themeConfig.colors)}
        }
      `;
    })
    .join('\n');

  return <style>{`
    :root {
      --bg-image-url: ${currentThemeSettings?.imageUrl ? `url('${currentThemeSettings.imageUrl}')` : 'none'};
      --bg-opacity: ${opacityValue};
      --bg-blur: ${blurValue}px;
      --radius: ${radiusValue}rem;
    }
    ${styles}
    `}</style>;
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
      getThemeSettingsAction(currentUser.id).then(settings => {
        setThemeSettings(settings);
      });
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
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center -z-10" 
        style={{ backgroundImage: 'var(--bg-image-url)' }} 
      />
      <div 
        className="fixed inset-0 w-full h-full -z-[5] bg-background/80"
        style={{
            backdropFilter: 'blur(var(--bg-blur))',
            WebkitBackdropFilter: 'blur(var(--bg-blur))',
        }}
      />
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
