
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Header } from "@/components/dashboard/header";
import { SideNav } from "@/components/dashboard/side-nav";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { useUser } from "@/context/user-context";
import { Skeleton } from '@/components/ui/skeleton';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
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
  );
}

    