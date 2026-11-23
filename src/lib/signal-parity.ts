/**
 * A faithful port of SIGNAL's shopping-item parsing and categorisation
 * (`src/lib/smart-shopping-core.ts` + `src/lib/ingredient-parser.ts`), so a
 * manual item added on the hub lands in SIGNAL's `custom_items` in exactly
 * the same shape SIGNAL's own "add item" writes — same `name`, `totalQty`,
 * `unit`, `category` and `searchTerm`. Matching those fields keeps the
 * `itemKey` (`category:name:unit:totalQty`) identical on both sides, so tick
 * state shares correctly between the hub and the SIGNAL app.
 *
 * Keep in sync with SIGNAL origin/main when you touch this.
 */

/* ── Categorisation ────────────────────────────────────────────────────── */

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  produce: ["onion","garlic","ginger","tomato","spinach","kale","silverbeet","broccoli","broccolini","capsicum","pepper","carrot","potato","kumara","kūmara","courgette","zucchini","eggplant","aubergine","mushroom","avocado","banana","apple","berry","berries","lemon","lime","mango","kiwifruit","kiwi","cucumber","asparagus","bok choy","pak choi","pumpkin","beetroot","cabbage","rocket","spring onion","coriander","parsley","mint","basil","chilli","pear","orange","fruit","lettuce","celery","leek","fennel","radish"],
  protein: ["chicken","beef","mince","lamb","pork","fish","salmon","tuna","prawn","tofu","tempeh","egg","turkey","lentil","chickpea","bean","edamame"],
  dairy: ["milk","yoghurt","yogurt","cream","cheese","butter","feta","haloumi"],
  pantry: ["coconut milk","coconut oil","olive oil","sesame oil","tamari","soy sauce","miso","mirin","maple syrup","honey","vinegar","soy","stock","tomato paste","canned","tinned","peanut butter","almond butter","tahini","chocolate","cacao","vanilla","flour","sugar","rice","pasta","noodle","oat","quinoa","bread","wrap","wholemeal"],
  frozen: ["frozen"],
};

// Aisles for items the keyword lists miss, checked in order.
const AISLE_RULES: Array<[RegExp, string]> = [
  [/\b(dried|ground|powder|seasoning|spices?|flakes)\b|\b(allspice|asafoetida|baking (powder|soda)|bay lea(f|ves)|cardamom|cinnamon|cumin|curry powder|garam masala|nutmeg|turmeric|paprika|saffron|star anise|herbes de provence|lavender|cocoa|cornstarch|cornflour)\b/, "pantry"],
  [/\b(snapper|fish(?!\s*sauce)|falafel|black-eyed peas|split (green |yellow )?peas)\b/, "protein"],
  [/\b(dill|rosemary|sage|tarragon|thyme|oregano|marjoram|mint|basil|parsley|coriander|chives|curry leaves|mixed (fresh )?herbs)\b/, "produce"],
  [/\b(salad (leaves|greens)|leafy greens|green leaves|spring greens|mixed greens|watercress|cavolo nero|pak choy|bok choy|brussels sprouts|cauliflower|celeriac|parsnips?|swede|shallots?|jalape(n|ñ)os?|mangetout|sweetcorn|corn kernels|peas|figs?|peach(es)?|grapes|pomegranate arils|pomelo|mixed vegetables)\b/, "produce"],
  [/\b(parmesan|halloumi|mozzarella|hummus|kimchi|ghee)\b/, "dairy"],
  [/\b(dates?|raisins|sultanas|dressing|broth|granola|coconut|peanuts|pepitas|hemp ?seeds|nori|wakame|nutritional yeast|protein powder|chips|taco shells|tortillas|popcorn|couscous|millet|semolina|capers|olives|artichoke|passata|curry paste|harissa|mustard|mayonnaise|sauces?|molasses|salsa|wine|chestnuts|sourdough|bread)\b/, "pantry"],
];

export function categoriseItem(name: string): string {
  const lower = name.toLowerCase();
  if (/frozen/.test(lower)) return "frozen";
  if (/\b(seed|seeds|tinned|canned|salt|pepper|spice|tahini|nut butter|peanut butter|almond butter)\b/.test(lower)) return "pantry";
  if (/\b(almonds?|almond meal|walnuts?|cashews?|hazelnuts?|pecans?|pistachios?|nuts)\b(?!\s*(milk|yoghurt|yogurt|cream))/.test(lower)) return "pantry";
  for (const [re, cat] of AISLE_RULES) if (re.test(lower)) return cat;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return "other";
}

/* ── NZ name translation ───────────────────────────────────────────────── */

const NZ_SYNONYMS: Array<[RegExp, string]> = [
  [/\bbell pepper(s)?\b/gi, "capsicum"],
  [/\b(red|green|yellow|orange) peppers?\b(?!\s*(flakes|powder|paste|sauce))/gi, "$1 capsicum"],
  [/\bcilantro\b/gi, "coriander"],
  [/\bscallion(s)?\b/gi, "spring onion"],
  [/\bgreen onion(s)?\b/gi, "spring onion"],
  [/\barugula\b/gi, "rocket"],
  [/\baubergine\b/gi, "eggplant"],
  [/\bcourgette(s)?\b/gi, "zucchini"],
  [/\bgarbanzo(s)?\b/gi, "chickpea"],
  [/\bsweet potato(es)?\b/gi, "kūmara"],
  [/\byogurt\b/gi, "yoghurt"],
  [/\bzucchini squash\b/gi, "zucchini"],
  [/\bswiss chard\b/gi, "silverbeet"],
  [/\bsnow pea(s)?\b/gi, "mangetout"],
  [/\bground beef\b/gi, "beef mince"],
  [/\bground lamb\b/gi, "lamb mince"],
  [/\bground turkey\b/gi, "turkey mince"],
  [/\bgreen bean(s)?\b/gi, "green beans"],
  [/\bgarbanzo bean(s)?\b/gi, "chickpeas"],
  [/\bbok ?choy\b/gi, "bok choy"],
  [/\beggplant\b/gi, "eggplant"],
];

export function toNZName(name: string): string {
  let n = name;
  for (const [re, rep] of NZ_SYNONYMS) n = n.replace(re, rep);
  return n;
}

/** "frozen or fresh strawberries" → "fresh strawberries"; "milk or plant milk" → "milk". */
export function firstAlternative(name: string): string {
  const parts = name.split(/\s+or\s+/i);
  if (parts.length < 2) return name;
  if (/^(fresh|frozen|dried|tinned|canned)$/i.test(parts[0])) return parts.slice(1).join(" or ");
  const noun = parts[parts.length - 1].trim().split(/\s+/).pop() ?? "";
  const shared = /^(oil|lentils|beans|rice|flour|milk|vinegar|sugar|seeds|nuts|cheese|pasta|noodles|stock|yoghurt|yogurt)$/i.test(noun);
  return shared && !/\s/.test(parts[0].trim()) && parts[0].trim().toLowerCase() !== noun.toLowerCase() ? `${parts[0].trim()} ${noun}` : parts[0];
}

/* ── Quantity parsing ──────────────────────────────────────────────────── */

export function parseQty(qty: string): number {
  if (!qty) return 1;
  const q = qty.trim();
  if (/[-–]/.test(q)) return Math.max(...q.split(/[-–]/).map(parseQty));
  const mixed = q.match(/^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return Number(mixed[1] ?? 0) + Number(mixed[2]) / Number(mixed[3] || 1);
  const n = Number(q);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

/* ── Ingredient parser ─────────────────────────────────────────────────── */

export interface ParsedIngredient {
  raw: string;
  quantity: string;
  unit: string;
  name: string;
  searchTerm: string;
}

const UNITS = new Set([
  "cup", "cups", "tbsp", "tsp", "tablespoon", "tablespoons", "teaspoon", "teaspoons",
  "oz", "ounce", "ounces", "lb", "lbs", "pound", "pounds",
  "g", "gram", "grams", "kg", "kilogram", "kilograms",
  "ml", "millilitre", "millilitres", "l", "litre", "litres",
  "can", "cans", "tin", "tins", "jar", "jars", "packet", "packets", "pack", "packs",
  "bunch", "bunches", "handful", "handfuls",
  "clove", "cloves", "slice", "slices", "piece", "pieces",
  "pinch", "dash", "sprig", "sprigs", "head", "heads",
]);

const TRAILING_NOTES = /\s+(?:to taste|to serve|to wilt|for (?:serving|drizzling|topping|garnish)|as (?:a )?topping|optional)$/i;
const LABEL = /^(?:optional(?:\s+toppings?)?|marinade|dressing|sauce|toppings?|garnish|to serve|for the [^:]{1,30}):\s*/i;
const VAGUE = /^(?:a\s+)?(?:small|large|big|generous|good)?\s*(?:handful|drizzle|few|splash|sprinkle|knob|little)\s+(?:of\s+)?/i;
const SIZE_WORDS = /^(?:fresh|large|medium|small|extra[- ]large|xl|ripe|thick|thin|heaped|level|good[- ]quality|organic|raw|mini|free[- ]range|plain|unsweetened|natural|extra virgin|full[- ]fat|low[- ]fat|lean|boneless|skinless|hulled|massaged|rinsed and drained|drained and rinsed|drained|rinsed|(?:lightly|loosely|firmly|tightly)?\s*packed)\s+/i;

const toNumber = (q: string) => {
  const m = q.trim().match(/^(?:(\d+)\s+)?(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+))?$/);
  if (!m) return NaN;
  return m[3] ? Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]) : Number(m[2]);
};

export function parseIngredient(raw: string): ParsedIngredient {
  const fractions: Record<string, string> = { "½": "1/2", "⅓": "1/3", "⅔": "2/3", "¼": "1/4", "¾": "3/4", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8" };
  const text = raw.trim().replace(/([0-9])([½⅓⅔¼¾⅛⅜⅝⅞])/g, "$1 $2").replace(/[½⅓⅔¼¾⅛⅜⅝⅞]/g, (c) => fractions[c]);

  const parens = [...text.matchAll(/\(([^)]*)\)/g)].map((m) => m[1].trim());
  const segments = text.replace(/\s*\([^)]*\)/g, "").split(",");
  const describesOnly = (part: string) => SIZE_WORDS.test(`${part.replace(/^[\d\s./]+(?:g|kg|ml|l|cups?|tbsp|tsp)?\s+/i, "").trim()} `);
  const head = segments.length > 1 && describesOnly(segments[0]) ? `${segments[0]} ${segments[1].trim()}` : segments[0];
  let cleaned = head.replace(TRAILING_NOTES, "").trim();
  cleaned = cleaned
    .replace(LABEL, "")
    .replace(/^(?:a\s+)?squeeze of\s+/i, "")
    .replace(/^(?:the\s+)?(?:zest and juice|juice and zest|zest|juice)\s+of\s+/i, "")
    .replace(/^(\d+(?:\s*\/\s*\d+)?)\s+an?\s+/i, "$1 ");
  if (!/^\d/.test(cleaned)) cleaned = cleaned.replace(VAGUE, "");

  const can = cleaned.match(/^(\d+(?:\s+\d+\/\d+|\s*\/\s*\d+|\.\d+)?)\s*(?:x|×|of(?:\s+an?)?)\s*(\d+(?:\.\d+)?)\s*(g|ml)\s+(?:(?:cans?|tins?|jars?|packets?|packs?|bags?)\s+)?(?:of\s+)?(.+)$/i);
  if (can && Number.isFinite(toNumber(can[1]))) {
    cleaned = `${Math.round(toNumber(can[1]) * Number(can[2]))}${can[3]} ${can[4]}`;
  }

  let parenQty = "";
  let parenUnit = "";
  for (const p of parens) {
    const m = p.match(/^([\d./\s-]+)\s*(g|gram|grams|kg|ml|l|cup|cups|tbsp|tsp)\b/i);
    if (m) { parenQty = m[1].trim(); parenUnit = m[2].toLowerCase(); break; }
  }

  const qtyMatch = cleaned.match(/^(\d+(?:\.\d+)?(?:\s+\d+\s*\/\s*\d+|\s*\/\s*\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?)\s*/);
  let quantity = "";
  let rest = cleaned;

  if (qtyMatch) {
    quantity = qtyMatch[1].trim();
    rest = cleaned.slice(qtyMatch[0].length).trim();
  }

  const words = rest.split(/\s+/);
  if (words.length > 1 && /^(small|large|big|heaped|level|generous)$/i.test(words[0]) && UNITS.has(words[1].toLowerCase().replace(/s$/, ""))) words.shift();
  let unit = "";
  let nameStart = 0;

  if ((words.length > 0 && UNITS.has(words[0].toLowerCase().replace(/s$/, ""))) || UNITS.has(words[0].toLowerCase())) {
    unit = words[0].toLowerCase();
    nameStart = 1;
    if (words[nameStart]?.toLowerCase() === "of") {
      nameStart++;
    }
  }

  let name = words.slice(nameStart).join(" ").trim()
    .replace(/^(?:cans?|tins?|jars?)\s+(?:of\s+)?/i, "")
    .replace(/^(?:lightly|loosely|firmly|tightly)\s+packed\s+/i, "");

  const cloveTail = !unit && name.match(/^(.+?)\s+(cloves?)$/i);
  if (cloveTail) {
    name = cloveTail[1];
    unit = cloveTail[2].toLowerCase();
  }

  if (!quantity && parenQty) {
    quantity = parenQty;
    unit = parenUnit;
  } else if (quantity && unit === "" && parenQty && parenUnit) {
    quantity = parenQty;
    unit = parenUnit;
  }

  const onlyDescriptor = /^(fresh|dried|frozen|organic|raw|cooked|canned|tinned|large|medium|small|baby|mini)$/i;
  if (!name || onlyDescriptor.test(name)) {
    name = raw.replace(/^[\d½⅓⅔¼¾⅛.\-–\s]+/, "").replace(/\s*\([^)]*\)/g, "").split(",")[0].trim() || raw;
  }

  let searchTerm = firstAlternative(name);
  for (let i = 0; i < 4 && SIZE_WORDS.test(searchTerm); i++) searchTerm = searchTerm.replace(SIZE_WORDS, "");
  for (let i = 0; i < 2 && SIZE_WORDS.test(searchTerm); i++) searchTerm = searchTerm.replace(SIZE_WORDS, "");
  searchTerm = searchTerm.trim();

  return { raw, quantity, unit, name: name || cleaned, searchTerm: searchTerm || name || cleaned };
}
