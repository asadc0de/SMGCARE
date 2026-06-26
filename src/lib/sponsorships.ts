export interface SponsorshipTier {
  id: string;
  tier?: string;
  tierName: string;
  price: string;
  maxLimit: number;
  soldCount: number;
  reservedCount: number;
  featured?: boolean;
  perks?: string[];
  hidden?: boolean;
  custom?: boolean;
  numberOfGolferSlots?: number;
}

export const defaultSponsorships: Omit<SponsorshipTier, "soldCount" | "reservedCount" | "hidden" | "custom">[] = [
  { id: "event", tierName: "Event Sponsor", price: "$10,000", maxLimit: 1, featured: true, perks: ["2 Foursomes", "Logo on ALL Signage", "2 Tee Signs"], numberOfGolferSlots: 8 },
  { id: "signature", tierName: "Signature Cocktail Sponsor", price: "$7,500", maxLimit: 1, perks: ["1 Foursome", "Logo on ALL Cocktail Tables", "Specialty Drink named after sponsor", "Tee Sign"], numberOfGolferSlots: 4 },
  { id: "caddie", tierName: "Caddie Sponsor", price: "$5,500", maxLimit: 2, perks: ["1 Foursome", "Logo on Caddie Bibs"], numberOfGolferSlots: 4 },
  { id: "barbecue", tierName: "Barbecue Sponsor", price: "$5,000", maxLimit: 1, perks: ["1 Foursome", "Logo at BBQ Station", "Tee Sign"], numberOfGolferSlots: 4 },
  { id: "refreshment", tierName: "Refreshment Sponsor", price: "$5,000", maxLimit: 1, perks: ["1 Foursome", "Logo at Refreshment Station", "Tee Sign"], numberOfGolferSlots: 4 },
  { id: "cart", tierName: "Golf Cart Sponsor", price: "$5,000", maxLimit: 1, perks: ["1 Foursome", "Logo on ALL Golf Carts"], numberOfGolferSlots: 4 },
  { id: "tee-marker", tierName: "Tee Marker Sponsor", price: "$4,000", maxLimit: 4, perks: ["1 Foursome", "Logo on ALL 36 Tee Markers"], numberOfGolferSlots: 4 },
  { id: "pin-flag", tierName: "Pin Flag Sponsor", price: "$4,000", maxLimit: 1, perks: ["1 Foursome", "Logo on ALL 18 Pin Flags", "Exclusive"], numberOfGolferSlots: 4 },
  { id: "raffle", tierName: "Raffle Sponsor", price: "$2,500", maxLimit: 1, perks: ["Logo on Signage at Raffle Tables"], numberOfGolferSlots: 0 },
  { id: "av", tierName: "AV Sponsor", price: "$2,250", maxLimit: 1, perks: [], numberOfGolferSlots: 0 },
  { id: "awards", tierName: "Awards Sponsor", price: "$1,500", maxLimit: 1, perks: [], numberOfGolferSlots: 0 },
  { id: "photography", tierName: "Photography Sponsor", price: "$1,250", maxLimit: 1, perks: [], numberOfGolferSlots: 0 },
  { id: "locker", tierName: "Locker Room Bar Sponsor", price: "$1,000", maxLimit: 1, perks: [], numberOfGolferSlots: 0 },
  { id: "closest-pin", tierName: "Closest to the Pin Sponsor", price: "$750", maxLimit: 1, perks: [], numberOfGolferSlots: 0 },
  { id: "closest-line", tierName: "Closest to the Line Sponsor", price: "$750", maxLimit: 1, perks: [], numberOfGolferSlots: 0 },
  { id: "longest-drive", tierName: "Longest Drive Sponsor", price: "$750", maxLimit: -1, perks: [], numberOfGolferSlots: 0 },
  { id: "driving-range", tierName: "Driving Range Sponsor", price: "$500", maxLimit: -1, perks: [], numberOfGolferSlots: 0 },
  { id: "putting-green", tierName: "Putting Green Sponsor", price: "$500", maxLimit: -1, perks: [], numberOfGolferSlots: 0 },
  { id: "tee-sign", tierName: "Tee Sign", price: "$275", maxLimit: -1, perks: [], numberOfGolferSlots: 0 },
];

export const buildSponsorshipRows = (
  records: Record<string, any>,
  options: { includeCustom?: boolean; includeHidden?: boolean } = {}
): SponsorshipTier[] => {
  const { includeCustom = true, includeHidden = false } = options;
  const defaultIds = new Set(defaultSponsorships.map((s) => s.id));

  const mappedDefaults = defaultSponsorships.flatMap((s) => {
    const record = records[s.id];

    if (record?.hidden && !includeHidden) {
      return [];
    }

    return [{
      ...s,
      tier: s.tierName,
      soldCount: record?.soldCount ?? 0,
      reservedCount: record?.reservedCount ?? 0,
      maxLimit: record?.maxLimit ?? s.maxLimit,
      featured: record?.featured ?? s.featured ?? false,
      perks: record?.perks ?? s.perks ?? [],
      hidden: record?.hidden ?? false,
      custom: record?.custom ?? false,
      numberOfGolferSlots: record?.numberOfGolferSlots ?? s.numberOfGolferSlots ?? 0,
    }];
  });

  if (!includeCustom) {
    return mappedDefaults;
  }

  const customRows = Object.entries(records)
    .filter(([id, record]) => !defaultIds.has(id) && (includeHidden || !record?.hidden))
    .map(([id, record]) => ({
      id,
      tier: record?.tierName || id,
      tierName: record?.tierName || id,
      price: record?.price || "$0",
      soldCount: record?.soldCount ?? 0,
      reservedCount: record?.reservedCount ?? 0,
      maxLimit: record?.maxLimit ?? 1,
      featured: record?.featured ?? false,
      perks: record?.perks ?? [],
      hidden: record?.hidden ?? false,
      custom: true,
      numberOfGolferSlots: record?.numberOfGolferSlots ?? 0,
    }));

  return [...mappedDefaults, ...customRows];
};
