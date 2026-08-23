import Link from "next/link";
import { prisma } from "@konstria/db";
import { ensureAccount } from "../../lib/ensureAccount.js";
import { NIGERIA_REGIONS } from "../../lib/regions.js";
import AppHeader from "../../components/AppHeader.js";
import { createProject } from "./actions.js";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default async function DashboardPage() {
  const user = await ensureAccount();
  const projects = await prisma.project.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { updatedAt: "desc" },
  });

  const [mostRecent, ...rest] = projects;

  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Your projects</h1>

        {mostRecent && (
          <Link
            href={`/projects/${mostRecent.id}`}
            className="mt-6 block rounded-lg border border-zinc-300 bg-zinc-50 p-5 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Continue where you left off</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-lg font-medium">{mostRecent.name}</span>
              <span className="text-sm text-zinc-500">{mostRecent.region}</span>
            </div>
            <div className="mt-1 text-sm text-zinc-500">Updated {formatDate(mostRecent.updatedAt)}</div>
          </Link>
        )}

        {rest.length > 0 && (
          <ul className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
            {rest.map((project) => (
              <li key={project.id} className="py-3">
                <Link href={`/projects/${project.id}`} className="flex w-full items-center justify-between gap-4 hover:underline">
                  <span>{project.name}</span>
                  <span className="shrink-0 text-sm text-zinc-500">
                    {project.region} · updated {formatDate(project.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {projects.length === 0 && (
          <p className="mt-6 text-sm text-zinc-500">No projects yet. Create your first one below.</p>
        )}

        <form action={createProject} className="mt-8 flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="font-medium">Start a new estimate</h2>
          <p className="text-sm text-zinc-500">
            Describe the building you want to estimate. You can upload a plan or enter dimensions
            yourself on the next screen.
          </p>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            What are you building?
            <input
              name="name"
              placeholder="Any building, any size: a bungalow, a block of flats, a warehouse, an office complex..."
              required
              className="rounded border border-zinc-300 px-3 py-2 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Where is it located?
            <select
              name="region"
              required
              defaultValue=""
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="" disabled>
                Select region
              </option>
              {NIGERIA_REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="self-start rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Continue
          </button>
        </form>
      </div>
    </>
  );
}
