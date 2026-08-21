import Link from "next/link";
import { prisma } from "@konstria/db";
import { ensureAccount } from "../../lib/ensureAccount.js";
import { NIGERIA_REGIONS } from "../../lib/regions.js";
import { createProject } from "./actions.js";

export default async function DashboardPage() {
  const user = await ensureAccount();
  const projects = await prisma.project.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Projects</h1>

      <ul className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
        {projects.map((project) => (
          <li key={project.id} className="py-3">
            <Link href={`/projects/${project.id}`} className="flex items-center justify-between hover:underline">
              <span>{project.name}</span>
              <span className="text-sm text-zinc-500">{project.region}</span>
            </Link>
          </li>
        ))}
        {projects.length === 0 && (
          <li className="py-3 text-sm text-zinc-500">No projects yet. Create one below.</li>
        )}
      </ul>

      <form action={createProject} className="mt-8 flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-medium">New project</h2>
        <input
          name="name"
          placeholder="Project name (e.g. 4-Bedroom Duplex, Lekki)"
          required
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
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
        <button
          type="submit"
          className="self-start rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Create project
        </button>
      </form>
    </div>
  );
}
