/** App-icon packs shown in Appearance → App Icons. */
export const ICON_PACKS: {
  id: string;
  name: string;
  gradient: string;
  promo?: string;
}[] = [
  { id: "classic", name: "Classic", gradient: "linear-gradient(135deg,#5865f2,#8b5cf6)" },
  { id: "neo", name: "Neo", gradient: "linear-gradient(135deg,#0ea5e9,#22d3ee)" },
  { id: "soft", name: "Soft", gradient: "linear-gradient(135deg,#f472b6,#fbbf24)" },
  { id: "pixel", name: "Pixel", gradient: "linear-gradient(135deg,#22c55e,#065f46)" },
  {
    id: "promo-summer",
    name: "Summer",
    gradient: "linear-gradient(135deg,#f59e0b,#ef4444)",
    promo: "Limited",
  },
  {
    id: "promo-space",
    name: "Space",
    gradient: "linear-gradient(135deg,#4c1d95,#0f172a)",
    promo: "Limited",
  },
];
