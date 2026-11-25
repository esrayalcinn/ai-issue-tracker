import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Issue Tracker",
  description: "Personal AI-integrated issue tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className="min-h-screen bg-zinc-950 text-zinc-100 antialiased"
      >
        {children}
      </body>
    </html>
  );
}
