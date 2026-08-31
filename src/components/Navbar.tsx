import Link from "next/link";
import { UserButton, SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function Navbar() {
  const { userId } = await auth();

  return (
    <nav className="border-b bg-white/80 dark:bg-[#030712]/70 backdrop-blur-md dark:border-slate-800/60 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-xl dark:text-white">AI Notes</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {userId ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" className="dark:text-slate-200 dark:hover:bg-slate-800">Dashboard</Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="secondary" className="dark:text-slate-200">Buy Credits</Button>
                </Link>
                <UserButton />
              </>
            ) : (
              <SignInButton mode="modal">
                <Button>Sign In</Button>
              </SignInButton>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
