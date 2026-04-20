import { notFound } from "next/navigation";
import { AdminLink } from "@/features/admin/components/admin-link";
import { hasAdminAccess } from "@/features/admin/data/get-admin-dashboard";
import { claimLegacyDataIfNeeded } from "@/features/auth/data/claim-legacy-data";
import { requireAuth } from "@/features/auth/data/get-auth-user";
import { ChildDetailsPage } from "@/features/children/components/child-details-page";
import { getChildren } from "@/features/children/data/get-children";
import { getChildById } from "@/features/children/data/get-child";
import { getTasksByChildId } from "@/features/tasks/data/get-tasks-by-child";

type ChildPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ChildPage({ params }: ChildPageProps) {
  await requireAuth();
  await claimLegacyDataIfNeeded();
  const { id } = await params;

  const [isAdmin, { child, errorMessage }, { children }] = await Promise.all([
    hasAdminAccess(),
    getChildById(id),
    getChildren()
  ]);

  if (!child || errorMessage) {
    return notFound();
  }

  const tasks = await getTasksByChildId(id);

  return (
    <ChildDetailsPage
      child={child}
      tasks={tasks}
      childList={children}
      headerActions={isAdmin ? <AdminLink /> : undefined}
    />
  );
}