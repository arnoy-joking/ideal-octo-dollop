import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { UserProvider } from "@/context/user-context";
import { getUsers } from "@/lib/users";
import { getThemeSettingsForUser } from "@/lib/theme";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const users = await getUsers();
  let themes = ["light", "dark", "system", "theme-default", "theme-ocean", "theme-sunset", "theme-forest", "theme-darkest"];

  // This logic is a bit tricky in server components.
  // We can't know the current user here. So we fetch themes for all users.
  // A more robust solution might involve a different approach for multi-user theme loading.
  if (users.length > 0) {
      const allUserSettings = await Promise.all(users.map(u => getThemeSettingsForUser(u.id)));
      const customThemeKeys = allUserSettings
        .flatMap(settings => (settings ? Object.keys(settings) : []))
        .filter(key => !themes.includes(key));
      
      themes.push(...Array.from(new Set(customThemeKeys)));
  }

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
