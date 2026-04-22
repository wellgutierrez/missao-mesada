import { describe, expect, it } from "vitest";
import { getAgeBasedSuggestions, getTaskSuggestionsByAge } from "@/features/children/data/age-based-suggestions";

describe("age-based suggestions", () => {
  it("returns the correct age group for a child inside the configured range", () => {
    const suggestions = getAgeBasedSuggestions(8);

    expect(suggestions?.ageGroup.key).toBe("7-9");
    expect(suggestions?.bonus.length).toBeGreaterThan(0);
    expect(suggestions?.discount.length).toBeGreaterThan(0);
    expect(suggestions?.rewards.length).toBeGreaterThan(0);
  });

  it("returns null for ages outside the supported range", () => {
    expect(getAgeBasedSuggestions(3)).toBeNull();
    expect(getAgeBasedSuggestions(19)).toBeNull();
    expect(getAgeBasedSuggestions(null)).toBeNull();
  });

  it("returns only bonus suggestions for bonus tasks", () => {
    const suggestions = getTaskSuggestionsByAge(11, "bonus");

    expect(suggestions).toContain("Organizar o quarto (cama, objetos e lixo)");
    expect(suggestions).not.toContain("Nao fazer tarefa escolar no dia combinado");
  });

  it("returns only discount suggestions for discount tasks", () => {
    const suggestions = getTaskSuggestionsByAge(11, "discount");

    expect(suggestions).toContain("Nao fazer tarefa escolar no dia combinado");
    expect(suggestions).not.toContain("Organizar o quarto (cama, objetos e lixo)");
  });
});