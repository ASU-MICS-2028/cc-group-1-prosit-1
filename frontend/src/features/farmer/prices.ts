import type { Prices } from "@/api/farmer"
import type { PictureSource } from "@/components/Picture"
import { CROPS } from "@/features/registration/options"

export type CropPrice = Prices["prices"][number]
export type Crop = CropPrice["crop"]

export const money = (value: number) => `GH₵ ${value.toFixed(2)}`

/** Crop groups for the filter chips (Figma Farmer · Market Prices). */
export const GROUPS = {
  grains: ["maize", "sorghum", "rice"],
  legumes: ["groundnut"],
  tubers: ["yam", "cassava"],
} as const satisfies Record<string, readonly Crop[]>

export function cropPicture(crop: Crop): PictureSource | undefined {
  return CROPS.find((c) => c.code === crop)?.picture
}

/** GH₵ change over the week, from today's price and the week's percentage. */
export function weekChange(price: number, percent: number) {
  return price - price / (1 + percent / 100)
}
