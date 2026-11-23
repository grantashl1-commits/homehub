/** Picture-first catalogues: groceries, habits, activities, stickers. */
import type { NoteColor } from "./types";

export const CATEGORIES = [
  { id: "produce", label: "Fruit & veg", emoji: "🥦", tint: "var(--sage-tint)", ink: "var(--sage-ink)" },
  { id: "protein", label: "Meat, fish & eggs", emoji: "🍗", tint: "var(--coral-tint)", ink: "var(--coral-ink)" },
  { id: "dairy", label: "Dairy & fridge", emoji: "🧀", tint: "var(--sun-tint)", ink: "#7a5a0c" },
  { id: "pantry", label: "Pantry", emoji: "🥫", tint: "var(--peach-tint)", ink: "#8a4b17" },
  { id: "frozen", label: "Frozen", emoji: "🧊", tint: "var(--sky-tint)", ink: "var(--sky-ink)" },
  { id: "other", label: "Home & other", emoji: "🧻", tint: "var(--lilac-tint)", ink: "var(--lilac-ink)" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function categoryMeta(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export const QUICK_GROCERIES: { name: string; emoji: string; category: CategoryId }[] = [
  { name: "Milk", emoji: "🥛", category: "dairy" },
  { name: "Bread", emoji: "🍞", category: "pantry" },
  { name: "Bananas", emoji: "🍌", category: "produce" },
  { name: "Apples", emoji: "🍎", category: "produce" },
  { name: "Eggs", emoji: "🥚", category: "protein" },
  { name: "Cheese", emoji: "🧀", category: "dairy" },
  { name: "Yoghurt", emoji: "🥣", category: "dairy" },
  { name: "Cereal", emoji: "🥣", category: "pantry" },
  { name: "Carrots", emoji: "🥕", category: "produce" },
  { name: "Chicken", emoji: "🍗", category: "protein" },
  { name: "Pasta", emoji: "🍝", category: "pantry" },
  { name: "Rice", emoji: "🍚", category: "pantry" },
  { name: "Strawberries", emoji: "🍓", category: "produce" },
  { name: "Juice", emoji: "🧃", category: "other" },
  { name: "Snacks", emoji: "🍪", category: "pantry" },
  { name: "Ice cream", emoji: "🍦", category: "frozen" },
  { name: "Toothpaste", emoji: "🪥", category: "other" },
  { name: "Toilet paper", emoji: "🧻", category: "other" },
];

const KEYWORDS: [RegExp, CategoryId][] = [
  [/\b(apple|banana|berr|grape|orange|mandarin|kiwi|pear|lemon|lime|avocado|tomato|lettuce|spinach|kale|carrot|potato|kūmara|kumara|onion|garlic|broccoli|capsicum|pepper|cucumber|zucchini|pumpkin|mushroom|herb|coriander|parsley|basil|celery|corn|peas|beans|fruit|veg|salad|ginger)/i, "produce"],
  [/\b(chicken|beef|mince|lamb|pork|bacon|ham|sausage|fish|salmon|tuna|prawn|egg|tofu|tempeh)/i, "protein"],
  [/\b(milk|cheese|yoghurt|yogurt|butter|cream|feta|halloumi|hummus)/i, "dairy"],
  [/\b(frozen|ice cream|ice-cream|peas frozen|ice block)/i, "frozen"],
  [/\b(bread|pasta|rice|noodle|flour|sugar|oil|sauce|cereal|oats|muesli|cracker|biscuit|snack|chips|honey|jam|peanut|tin|can|stock|spice|salt|coffee|tea|cocoa|wrap)/i, "pantry"],
];

export function categorise(name: string): CategoryId {
  for (const [re, cat] of KEYWORDS) if (re.test(name)) return cat;
  return "other";
}

export function groceryEmoji(name: string): string {
  const hit = QUICK_GROCERIES.find((g) => g.name.toLowerCase() === name.toLowerCase().trim());
  return hit?.emoji ?? categoryMeta(categorise(name)).emoji;
}

/** Habit picture cards. Icons are PointPals' illustrated chore tiles. */
export const HABIT_PRESETS: { title: string; icon: string; forKids: boolean }[] = [
  { title: "Brush my teeth", icon: "brushteeth-night-bed.png", forKids: true },
  { title: "Read a book", icon: "journalling.png", forKids: true },
  { title: "Tidy my room", icon: "tidied-room.png", forKids: true },
  { title: "Be kind", icon: "used-kindwords.png", forKids: true },
  { title: "Try a new food", icon: "finished-dinner.png", forKids: true },
  { title: "Help without being asked", icon: "helped-without-being-asked.png", forKids: true },
  { title: "Play outside", icon: "exercised.png", forKids: true },
  { title: "Get ready for bed", icon: "get-ready-for-bed.png", forKids: true },
  { title: "Share my toys", icon: "sharing-toys.png", forKids: true },
  { title: "Calm down when I'm mad", icon: "calmed-down-after-getting-mad.png", forKids: true },
  { title: "Drink my water", icon: "adult-drank-21L-water.png", forKids: false },
  { title: "Move for 30 minutes", icon: "adult-exercised-30min.png", forKids: false },
  { title: "Meditate", icon: "adult-meditated.png", forKids: false },
  { title: "Journal", icon: "adult-journalling.png", forKids: false },
  { title: "Bed on time", icon: "adult-bed-before-targettime.png", forKids: false },
  { title: "No doom-scrolling", icon: "adult-nodoomscrolling.png", forKids: false },
  { title: "Phone-free dinner", icon: "adult-no-phone.png", forKids: false },
  { title: "Eat well", icon: "adult-atehealthy.png", forKids: false },
];

export const KID_ACTIVITIES = [
  { id: "party", label: "Party", emoji: "🎉" },
  { id: "playdate", label: "Playdate", emoji: "🧸" },
  { id: "sport", label: "Sport", emoji: "⚽" },
  { id: "swim", label: "Swimming", emoji: "🏊" },
  { id: "school", label: "School thing", emoji: "🏫" },
  { id: "birthday", label: "Birthday", emoji: "🎂" },
  { id: "holiday", label: "Holiday", emoji: "🏖️" },
  { id: "visit", label: "Visit", emoji: "🏡" },
];

export const NOTE_COLORS: { id: NoteColor; bg: string; edge: string; ink: string }[] = [
  { id: "sun", bg: "#FFE98F", edge: "#F2CF4D", ink: "#5C4300" },
  { id: "rose", bg: "#FFC9D6", edge: "#F49AB2", ink: "#6E1F37" },
  { id: "sky", bg: "#C7E4FF", edge: "#8DC1F0", ink: "#173E66" },
  { id: "sage", bg: "#CDEFC9", edge: "#94D08D", ink: "#1E4D22" },
  { id: "lilac", bg: "#E3D6FF", edge: "#B79BF0", ink: "#3D2773" },
  { id: "peach", bg: "#FFD9B8", edge: "#F6AF74", ink: "#6B3510" },
];

export function noteColor(id: NoteColor) {
  return NOTE_COLORS.find((c) => c.id === id) ?? NOTE_COLORS[0];
}

export const STICKERS = ["❤️", "⭐", "🌈", "🦄", "🐶", "🌻", "🎉", "😘", "🍦", "🚀", "👍", "🤗"];

export const REACTIONS = ["❤️", "🤗", "😂", "⭐"];
