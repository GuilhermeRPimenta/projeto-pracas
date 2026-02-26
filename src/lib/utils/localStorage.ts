import { BrazilianStates } from "@prisma/client";
import { z } from "zod";

export const LAST_SELECTED_LOCATION_KEY = "lastSelectedStateAndCity";

const storedLocationSelectionSchema = z.object({
  state: z.nativeEnum(BrazilianStates),
  cityId: z.number().nullable().optional(),
});

export const getStoredLocationSelection = () => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LAST_SELECTED_LOCATION_KEY);
  if (!raw) return null;
  try {
    const parsed = storedLocationSelectionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return {
      state: parsed.data.state,
      cityId: parsed.data.cityId ?? null,
    };
  } catch {
    return null;
  }
};
