
"use client";

import { usePathname } from "next/navigation";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarContent,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Compass, LayoutDashboard, Settings, LifeBuoy, ClipboardList, Lock, UserPlus, FileText, CalendarDays, MessageSquare, BookCopy, Target, BookOpen, ChevronRight, Sparkles } from "lucide-react";
import { AddUserDialog } from "./add-user-dialog";
import { useUser } from "@/context/user-context";
import { getUsersAction } from "@/app/actions/user-actions";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import type { Course } from "@/lib/types";
import { getCoursesAction } from "@/app/actions/course-actions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/syllabus", label: "Syllabus", icon: BookCopy },
  { href: "/monthly-goal", label: "Monthly Goal", icon: Target },
  { href: "/scheduler", label: "Scheduler", icon: Sparkles },
  { href: "/pdf-hub", label: "PDF Hub", icon: FileText },
  { href: "/weekly-routine", label: "Weekly Routine", icon: CalendarDays },
  { href: "/progress", label: "Public Progress", icon: ClipboardList },
  { href: "/manage-courses", label: "Manage Courses", icon: Lock },
];

function CourseNav() {
  const pathname = usePathname();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function loadCourses() {
      setIsLoading(true);
      const fetchedCourses = await getCoursesAction();
      setCourses(fetchedCourses);
      setIsLoading(false);
    }
    loadCourses();
  }, []);

  useEffect(() => {
    if (pathname.includes('/class/')) {
      setIsOpen(true);
    }
  }, [pathname]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Your Courses" className="justify-between">
            <div className="flex items-center gap-2">
              <BookOpen />
              <span>Your Courses</span>
            </div>
            <ChevronRight className={cn("transition-transform duration-200", isOpen && "rotate-90")} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
      </SidebarMenuItem>
      <CollapsibleContent>
        <SidebarMenuSub>
          {isLoading ? (
            <>
              <SidebarMenuSkeleton showIcon />
              <SidebarMenuSkeleton showIcon />
            </>
          ) : (
            courses.map((course) => (
              <SidebarMenuSubItem key={course.id}>
                <SidebarMenuSubButton
                  asChild
                  isActive={pathname === `/class/${course.slug}`}
                >
                  <Link href={`/class/${course.slug}`}>
                    <span>{course.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))
          )}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

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
                isActive={pathname.startsWith(item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          
          <CourseNav />
          
          <SidebarMenuItem>
              <SidebarMenuButton
              asChild
              isActive={pathname.startsWith("/settings")}
              tooltip="Settings"
              >
              <Link href="/settings">
                  <Settings />
                  <span>Settings</span>
              </Link>
              </SidebarMenuButton>
          </SidebarMenuItem>
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
