import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        KONSTRIA
      </h1>
      <p className="mt-3 max-w-md text-zinc-600 dark:text-zinc-400">
        Construction quantity takeoff and cost estimation for Nigerian quantity
        surveyors, builders, and engineers, from foundation to finish.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {userId ? (
          <Link href="/dashboard" className="rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900">
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link href="/sign-up" className="rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900">
              Sign up
            </Link>
            <Link href="/sign-in" className="rounded border border-zinc-300 px-4 py-2 dark:border-zinc-700">
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
