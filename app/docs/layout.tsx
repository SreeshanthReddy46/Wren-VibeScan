import * as React from "react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { DocsSidebar } from "@/components/docs/DocsSidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Navbar />
      <div className="flex-1 pt-28 sm:pt-36 pb-20">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            {/* Sidebar Navigation */}
            <div className="md:col-span-3 lg:col-span-3">
              <div className="sticky top-28 p-4 rounded-2xl bg-white/75 border border-sky-200/70 backdrop-blur-md shadow-xs">
                <DocsSidebar />
              </div>
            </div>

            {/* Main Documentation Area */}
            <main className="md:col-span-9 lg:col-span-9 min-w-0">
              <div className="max-w-3xl space-y-8 p-6 sm:p-8 rounded-3xl bg-white/80 border border-sky-200/70 backdrop-blur-md shadow-sm">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
