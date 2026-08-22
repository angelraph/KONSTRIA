import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();
  const primaryHref = userId ? "/dashboard" : "/sign-up";
  const primaryLabel = userId ? "Go to dashboard" : "Get started free";

  return (
    <div className="bg-white text-zinc-900 dark:bg-black dark:text-zinc-50">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">KONSTRIA</span>
        {userId ? (
          <Link href="/dashboard" className="text-sm font-medium hover:underline">
            Dashboard
          </Link>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <Link href="/sign-in" className="hover:underline">
              Sign in
            </Link>
            <Link href="/sign-up" className="rounded bg-zinc-900 px-4 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
              Sign up
            </Link>
          </div>
        )}
      </nav>

      <header className="mx-auto max-w-4xl px-6 pt-16 pb-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Building cost estimates you don't have to do by hand
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          KONSTRIA takes a building&apos;s dimensions, from foundation to finish, and turns them into a
          full bill of quantities and cost estimate using real, sourced Nigerian material prices.
          Built for quantity surveyors, builders, and engineers.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={primaryHref}
            className="rounded bg-zinc-900 px-6 py-3 text-base font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {primaryLabel}
          </Link>
          <a href="#how-it-works" className="rounded border border-zinc-300 px-6 py-3 text-base font-medium dark:border-zinc-700">
            See how it works
          </a>
        </div>
      </header>

      <section id="how-it-works" className="border-t border-zinc-200 bg-zinc-50 py-16 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-semibold">Two ways to get your building into KONSTRIA</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
              <h3 className="font-semibold">Upload your plan or drawing</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Upload a photo or scan of your floor plan. You mark two points you know the real
                distance between (for example, the length of an outer wall), and KONSTRIA uses AI vision
                to read off the walls, rooms, and openings, then shows you exactly what it detected so
                you can correct anything before it&apos;s used. Nothing is calculated from a guess.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
              <h3 className="font-semibold">Enter dimensions manually</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                No drawing handy? Type in your levels, room sizes, wall lengths, doors, windows,
                foundation and column volumes, reinforcement, and roof area directly. Same underlying
                engine, same accuracy, just typed in instead of read from an image.
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div>
              <div className="text-sm font-semibold text-zinc-400">Step 1</div>
              <p className="mt-1 font-medium">Give us the building</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Upload a plan, or enter dimensions by hand.</p>
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-400">Step 2</div>
              <p className="mt-1 font-medium">We calculate exact quantities</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Blocks, cement, sand, granite, reinforcement, roofing sheets, plaster, and paint, using
                standard quantity-surveying formulas, stage by stage from substructure to finishes.
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-400">Step 3</div>
              <p className="mt-1 font-medium">Real prices get applied</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Every material is priced from tracked Nigerian market sources, or your own supplier
                quote. Every price shows its source and date, never a guess. Export the full BOQ to
                Excel.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-semibold">Built for how Nigerian construction actually works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Priced by region",
                body: "Material prices are tracked separately for Lagos, FCT, Rivers, Oyo, Kano, and Enugu, since costs vary by state.",
              },
              {
                title: "Your own rates, when you have them",
                body: "Already have a supplier quote? Enter it and it overrides the tracked market price for your project.",
              },
              {
                title: "Full traceability",
                body: "Every quantity traces back to the wall, room, or element that produced it. Click through from a total to see where it came from.",
              },
              {
                title: "Frozen estimates",
                body: "Once generated, a bill of quantities never silently changes. Regenerating creates a new version, so past estimates stay reproducible.",
              },
              {
                title: "Excel export",
                body: "Download a stage-by-stage workbook with live formulas, ready to send to a client or contractor.",
              },
              {
                title: "No fabricated numbers",
                body: "If a material has no tracked price and no rate you've entered, it's shown as missing. It is never filled in with a guess.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
                <h3 className="font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 py-16 text-center dark:border-zinc-800">
        <h2 className="text-2xl font-semibold">Create your account and start your first estimate</h2>
        <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">
          Every project you create is saved to your account, so you can pick up exactly where you left
          off.
        </p>
        <Link
          href={primaryHref}
          className="mt-6 inline-block rounded bg-zinc-900 px-6 py-3 text-base font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {primaryLabel}
        </Link>
      </section>

      <footer className="border-t border-zinc-200 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
        KONSTRIA: construction quantity takeoff and cost estimating for Nigerian builders and engineers.
      </footer>
    </div>
  );
}
