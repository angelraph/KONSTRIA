import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function AppHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          KONSTRIA
        </Link>
        <UserButton />
      </div>
    </header>
  );
}
