import { ChildrenPage } from "@/features/children/components/children-page";
import { AdminLink } from "@/features/admin/components/admin-link";
import { hasAdminAccess } from "@/features/admin/data/get-admin-dashboard";
import { claimLegacyDataIfNeeded } from "@/features/auth/data/claim-legacy-data";
import { requireAuth } from "@/features/auth/data/get-auth-user";
import { getChildren } from "@/features/children/data/get-children";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  await requireAuth();
  await claimLegacyDataIfNeeded();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [isAdmin, { children, errorMessage }] = await Promise.all([hasAdminAccess(), getChildren()]);
  const deletedChild = typeof resolvedSearchParams?.deletedChild === "string" ? resolvedSearchParams.deletedChild : null;

  return (
    <ChildrenPage
      children={children}
      errorMessage={errorMessage}
      successMessage={deletedChild ? `Perfil de ${deletedChild} excluido com sucesso.` : undefined}
      headerActions={isAdmin ? <AdminLink /> : undefined}
    />
  );
}
