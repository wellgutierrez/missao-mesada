"use server";

import { createChild } from "../data/get-children";

export async function createChildAction(
  name: string,
  age: number | null,
  baseAllowance: number
): Promise<{ error?: string }> {
  const { child, errorMessage } = await createChild(name, age, baseAllowance);

  if (errorMessage) {
    return { error: errorMessage };
  }

  return {};
}
