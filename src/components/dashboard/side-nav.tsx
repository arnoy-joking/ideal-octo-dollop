"use client";

import { usePathname } from "next/navigation";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarContent,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Compass, LayoutDashboard, Settings, LifeBuoy, ClipboardList, Lock, UserPlus, FileText, CalendarDays, MessageSquare, Calculator } from "lucide-react";
import { AddUserDialog } from "./add-user-dialog";
import { useUser } from "@/context/user-context";
import { getUsersAction } from "@/app/actions/user-actions";
import { Button } from "../ui/button";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Calculator", icon: Calculator },
  { href: "/pdf-hub", label: "PDF Hub", icon: FileText },
  { href: "/weekly-routine", label: "Weekly Routine", icon: CalendarDays },
  { href: "/progress", label: "Public Progress", icon: ClipboardList },
  { href: "/manage-courses", label: "Manage Courses", icon: Lock },
];

export function SideNav() {
  const pathname = usePathname();
  const { setUsers } = useUser();

  const refreshUsers = async () => {
      const updatedUsers = await getUsersAction();
      setUsers(updatedUsers);
  };

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 p-1">
          <Compass className="w-8 h-8 text-accent" />
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="font-bold text-lg text-sidebar-foreground">
              Course Compass
            </h2>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href) && (item.href !== '#' || pathname === item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border">
         <AddUserDialog onUserAdded={refreshUsers}>
            <Button variant="outline" className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:p-2">
                <UserPlus />
                <span className="group-data-[collapsible=icon]:hidden">Add Profile</span>
            </Button>
        </AddUserDialog>
        <div className="group-data-[collapsible=icon]:hidden text-xs text-center p-4 text-sidebar-foreground/60">
            &copy; {new Date().getFullYear()} Course Compass
        </div>
      </SidebarFooter>
    </>
  );
}
