export const FREE_OPENROUTER_MODELS = [
  {
    id: "openrouter/free",
    name: "Auto — Free Model",
  },
  {
    id: "nvidia/nemotron-3-ultra:free",
    name: "Nemotron 3 Ultra (Free)",
  },
] as const;

export type FreeOpenRouterModelId =
  (typeof FREE_OPENROUTER_MODELS)[number]["id"];

export const DEFAULT_FREE_OPENROUTER_MODEL: FreeOpenRouterModelId =
  "openrouter/free";

export function isFreeOpenRouterModelId(
  value: unknown,
): value is FreeOpenRouterModelId {
  return (
    typeof value === "string" &&
    FREE_OPENROUTER_MODELS.some((model) => model.id === value)
  );
}
