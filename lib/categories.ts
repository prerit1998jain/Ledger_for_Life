// Appendix A — Category enum (PRD §Appendix A)
export const CATEGORY_KEYS = [
  "physical",
  "mental",
  "work",
  "growth",
  "money",
  "passive",
  "sports",
  "relationships",
  "ventures",
  "travel",
  "identity",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  physical: "Physical Health",
  mental: "Mental & Emotional Health",
  work: "Work & Career",
  growth: "Growth & Learning",
  money: "Money & Wealth",
  passive: "Passive Income",
  sports: "Sports",
  relationships: "Relationships",
  ventures: "Personal Ventures & Community",
  travel: "Travel & Experiences",
  identity: "Identity, Values & Direction",
};

export const CATEGORY_HINTS: Record<CategoryKey, string> = {
  physical: "Training, nutrition, sleep, recovery, medical",
  mental: "Mood, stress, motivation, self-talk, coping",
  work: "Performance, ambition, key relationships, wins & friction",
  growth: "Skills, ideas, what you're getting better at",
  money: "Income, spending, savings, investments, security",
  passive: "Priority sub-track of Money — passive income specifically",
  sports: "Performance, team & captaincy, drive, enjoyment",
  relationships: "Partner, family, friends, network",
  ventures: "Side projects, creative work, leadership",
  travel: "Upcoming plans, recent trips, aspirations",
  identity: "Values, vision, what success means now",
};

// Display order for the composer: passive nests directly under money.
export const CATEGORY_ORDER: CategoryKey[] = [
  "physical",
  "mental",
  "work",
  "growth",
  "money",
  "passive",
  "sports",
  "relationships",
  "ventures",
  "travel",
  "identity",
];

export function isCategoryKey(value: string): value is CategoryKey {
  return (CATEGORY_KEYS as readonly string[]).includes(value);
}
