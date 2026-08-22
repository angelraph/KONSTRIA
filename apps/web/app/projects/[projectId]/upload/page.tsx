import Link from "next/link";
import { requireProjectAccess } from "../../../../lib/requireProjectAccess.js";
import AppHeader from "../../../../components/AppHeader.js";
import PlanUploadWizard from "./PlanUploadWizard.js";

export default async function UploadPlanPage({ params }: PageProps<"/projects/[projectId]/upload">) {
  const { projectId } = await params;
  const { project } = await requireProjectAccess(projectId);

  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href={`/projects/${projectId}`} className="text-sm text-zinc-500 hover:underline">
          ← {project.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Upload floor plan</h1>
        <p className="text-sm text-zinc-500">
          Extract walls, rooms, and openings from a photo or scan of your drawing.
        </p>
        <PlanUploadWizard projectId={projectId} />
      </div>
    </>
  );
}
