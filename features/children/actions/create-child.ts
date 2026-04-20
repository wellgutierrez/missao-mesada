"use server";

import { createChild } from "../data/get-children";

export async function createChildAction(
  name: string,
  age: number | null,
  baseAllowance: number
): Promise<{ error?: string }> {
  if (age == null || Number.isNaN(age)) {
    return { error: "Idade e obrigatoria." };
  }

  if (age < 4 || age > 18) {
    return { error: "A idade precisa estar entre 4 e 18 anos." };
  }

  const { errorMessage } = await createChild(name, age, baseAllowance);

  if (errorMessage) {
    return { error: errorMessage };
  }

  return {};
}