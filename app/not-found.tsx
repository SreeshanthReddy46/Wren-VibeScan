import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-50 text-center space-y-6">
      <div className="h-16 w-16 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-lg">
        <FileQuestion className="h-8 w-8" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950">404 - Page Not Found</h1>
        <p className="text-sm text-zinc-600">
          The page or scan report you are looking for doesn&apos;t exist or has been moved.
        </p>
      </div>

      <div className="pt-2">
        <Link href="/">
          <Button variant="primary" className="rounded-xl gap-2 font-medium px-6">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Home</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
