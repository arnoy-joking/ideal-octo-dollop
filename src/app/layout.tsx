import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { UserProvider } from "@/context/user-context";
import { getUsers } from "@/lib/users";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-code-pro",
});

export const metadata: Metadata = {
  title: "Course Compass",
  description: "Your guide to mastering new skills.",
};

const themes = ["light", "dark", "system", "theme-default", "theme-ocean", "theme-sunset", "theme-forest", "theme-matrix"];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const users = await getUsers();
  return (
    <html lang="en" suppressHydrationWarning className={cn(inter.variable, sourceCodePro.variable)}>
      <head />
      <body>
        <UserProvider initialUsers={users}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            themes={themes}
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}
