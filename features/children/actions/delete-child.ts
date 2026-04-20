"use server";

import { revalidatePath } from "next/cache";
import { deleteChild } from "../data/get-children";

export async function deleteChildAction(childId: string): Promise<{ error?: string }> {
  const { errorMessage } = await deleteChild(childId);

  if (errorMessage) {
    return { error: errorMessage };
  }

  revalidatePath("/");
  revalidatePath("/perfil");
  revalidatePath("/children/new");

  return {};
}