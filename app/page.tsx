import { ChildrenPage } from "@/features/children/components/children-page";
import { getChildren } from "@/features/children/data/get-children";

export default async function HomePage() {
  const { children, errorMessage } = await getChildren();

  return <ChildrenPage children={children} errorMessage={errorMessage} />;
}
