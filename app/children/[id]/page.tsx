import { notFound } from "next/navigation";
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
  const { id } = await params;

  const { child, errorMessage } = await getChildById(id);
  const { children } = await getChildren();

  if (!child || errorMessage) {
    return notFound();
  }

  const tasks = await getTasksByChildId(id);

  return <ChildDetailsPage child={child} tasks={tasks} childList={children} />;
}