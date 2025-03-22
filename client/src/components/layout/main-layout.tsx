import React from "react";
import Navbar from "./navbar";
import { useAuth } from "@/hooks/use-auth";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-100">
      <Navbar />
      <main className="flex-1 pb-8">
        {children}
      </main>
    </div>
  );
}
