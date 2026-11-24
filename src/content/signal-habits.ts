/**
 * SIGNAL's habit library (signalnz src/data/habit-library.ts) with its hand-
 * reviewed illustrations (src/data/habit-art-map.json), for picking a habit on
 * the hub. Generated from the signalnz repo; the pictures are served from
 * SIGNAL's site (public/images/habits/<image>.png). Habits without a reviewed
 * picture are left out.
 */
export type HabitGroup = "food" | "move" | "mind" | "supplements";

export interface SignalHabit {
  id: string;
  name: string;
  description: string;
  frequency: string;
  group: HabitGroup;
  /** File stem in SIGNAL's public/images/habits. */
  image: string;
}

export const SIGNAL_HABITS: SignalHabit[] = [
  {"id": "lib-30-plants", "name": "30 Plant Foods This Week", "description": "Aim for 30 different plant foods across the week.", "frequency": "Weekly", "group": "food", "image": "30-plant-foods-this-week"},
  {"id": "lib-fermented-food", "name": "Fermented Food Daily", "description": "Include yoghurt, kefir, kimchi, or sauerkraut.", "frequency": "Daily", "group": "food", "image": "fermented-food-daily"},
  {"id": "lib-oily-fish", "name": "Oily Fish 2x This Week", "description": "Salmon, sardines, or mackerel for omega-3, vitamin D, and protein.", "frequency": "2x weekly", "group": "food", "image": "oily-fish-2x-this-week"},
  {"id": "lib-seed-cycle", "name": "Seed Cycle Daily", "description": "Days 1–14: pumpkin + flax seeds. Days 15–28: sunflower + sesame seeds.", "frequency": "Daily", "group": "food", "image": "seed-cycle-daily"},
  {"id": "lib-cruciferous", "name": "Cruciferous Vegs 3x", "description": "Broccoli, cauliflower, or kale for oestrogen detoxification via DIM.", "frequency": "3x weekly", "group": "food", "image": "cruciferous-vegs-3x"},
  {"id": "lib-protein-breakfast", "name": "Protein at Breakfast", "description": "20–30g protein to stabilise blood sugar, reduce cravings, and support lean muscle.", "frequency": "Daily", "group": "food", "image": "protein-at-breakfast"},
  {"id": "lib-no-processed", "name": "No Ultra-Processed Foods", "description": "Eliminate ultra-processed foods today.", "frequency": "Daily", "group": "food", "image": "no-ultra-processed-foods"},
  {"id": "lib-water-2l", "name": "Drink 2L Water", "description": "Drink 2 litres of water throughout the day.", "frequency": "Daily", "group": "food", "image": "lib-water-2l"},
  {"id": "lib-leafy-greens", "name": "Leafy Greens at Meals", "description": "Eat a handful of leafy greens at lunch and dinner.", "frequency": "Daily", "group": "food", "image": "leafy-greens-at-meals"},
  {"id": "lib-reduce-sugar", "name": "Reduce Refined Sugar", "description": "Minimise refined sugar intake today.", "frequency": "Daily", "group": "food", "image": "reduce-refined-sugar"},
  {"id": "lib-meal-prep", "name": "Meal Prep 3 Days", "description": "Prep meals for the next 3 days.", "frequency": "2x weekly", "group": "food", "image": "meal-prep-3-days"},
  {"id": "lib-new-recipe", "name": "New Whole Food Recipe", "description": "Cook one new whole food recipe this week.", "frequency": "Weekly", "group": "food", "image": "new-whole-food-recipe"},
  {"id": "lib-healthy-fat", "name": "Healthy Fat Every Meal", "description": "Include avocado, olive oil, nuts, or seeds — supports fat-soluble vitamin absorption.", "frequency": "Daily", "group": "food", "image": "healthy-fat-every-meal"},
  {"id": "lib-no-alcohol", "name": "No Alcohol This Week", "description": "Abstain from alcohol for the full week.", "frequency": "Weekly", "group": "food", "image": "no-alcohol-this-week"},
  {"id": "lib-mindful-eating", "name": "Mindful Eating", "description": "No screens during meals today.", "frequency": "Daily", "group": "food", "image": "mindful-eating"},
  {"id": "lib-warm-lemon-water", "name": "Warm Lemon Water", "description": "First drink of the day — warm water with the juice of half a lemon before food or coffee.", "frequency": "Daily", "group": "food", "image": "lib-warm-lemon-water"},
  {"id": "lib-10k-steps", "name": "10,000 Steps Today", "description": "Hit 10,000 steps throughout the day.", "frequency": "Daily", "group": "move", "image": "10000-steps-today"},
  {"id": "lib-morning-walk", "name": "Morning Walk", "description": "20–30 minute morning walk to start the day.", "frequency": "Daily", "group": "move", "image": "morning-walk"},
  {"id": "lib-strength", "name": "Strength Training", "description": "Resistance training for muscle and bone health.", "frequency": "2–3x weekly", "group": "move", "image": "strength-training"},
  {"id": "lib-hiit", "name": "HIIT Session", "description": "20–30 minutes of high intensity interval training.", "frequency": "1–2x weekly", "group": "move", "image": "lib-hiit"},
  {"id": "lib-yoga", "name": "Yoga or Pilates", "description": "Mindful movement and breath coordination, any length.", "frequency": "Weekly", "group": "move", "image": "yoga-or-pilates"},
  {"id": "lib-stretching", "name": "Stretching / Mobility", "description": "10 minutes of gentle stretching for joints and muscles.", "frequency": "Daily", "group": "move", "image": "mobility-stretching"},
  {"id": "lib-swimming", "name": "Swimming", "description": "Low-impact full-body cardiovascular exercise.", "frequency": "Weekly", "group": "move", "image": "lib-swimming"},
  {"id": "lib-cycling", "name": "Cycling", "description": "Indoor or outdoor cycling for cardio and leg strength.", "frequency": "Weekly", "group": "move", "image": "lib-cycling"},
  {"id": "lib-dance", "name": "Dance or Free Movement", "description": "Dance class or intuitive free movement.", "frequency": "Weekly", "group": "move", "image": "lib-dance"},
  {"id": "lib-rest-day", "name": "Rest Day", "description": "Active recovery only — walk, gentle stretch, nothing intense.", "frequency": "1–2x weekly", "group": "move", "image": "rest-day"},
  {"id": "lib-movement-break", "name": "Movement Break Hourly", "description": "Stand or walk briefly every hour.", "frequency": "Hourly", "group": "move", "image": "movement-break-hourly"},
  {"id": "lib-lunch-walk", "name": "Lunchtime Walk", "description": "Even 15 minutes counts — get outside at lunch.", "frequency": "Daily", "group": "move", "image": "lunchtime-walk"},
  {"id": "lib-two-strength", "name": "Two Strength Sessions", "description": "Complete two strength training sessions this week.", "frequency": "Weekly", "group": "move", "image": "two-strength-sessions"},
  {"id": "lib-zone2", "name": "Zone 2 Cardio", "description": "30+ minutes at conversational pace for metabolic health, fat oxidation, and longevity.", "frequency": "2–3x weekly", "group": "move", "image": "zone-2-cardio"},
  {"id": "lib-morning-meditation", "name": "Morning Meditation", "description": "10 minutes of quiet breathing or mindfulness to calm the nervous system.", "frequency": "Daily", "group": "mind", "image": "morning-meditation"},
  {"id": "lib-evening-breathwork", "name": "Evening Breathwork", "description": "Slow breathing (4-7-8 or box breathing) to activate the parasympathetic nervous system.", "frequency": "Nightly", "group": "mind", "image": "evening-breathwork"},
  {"id": "lib-gratitude-practice", "name": "Gratitude Practice", "description": "Write three things you are grateful for today.", "frequency": "Daily", "group": "mind", "image": "gratitude-practice"},
  {"id": "lib-time-in-nature", "name": "Time in Nature", "description": "Spend time outdoors in green space.", "frequency": "Daily or weekly", "group": "mind", "image": "time-in-nature"},
  {"id": "lib-digital-sunset", "name": "Digital Sunset", "description": "No screens 60 minutes before sleep.", "frequency": "Nightly", "group": "mind", "image": "digital-sunset"},
  {"id": "lib-sauna-session", "name": "Sauna Session", "description": "15–20 minutes of heat exposure.", "frequency": "3–4x weekly", "group": "mind", "image": "sauna-session"},
  {"id": "lib-cold-shower", "name": "Cold Shower", "description": "Finish shower with 30–60 seconds of cold water.", "frequency": "Optional daily", "group": "mind", "image": "cold-shower"},
  {"id": "lib-morning-sunlight", "name": "Morning Sunlight (10–30 min)", "description": "Stand or sit outside in natural light within 1 hour of waking — no sunglasses for the first 10 minutes. Overcast still counts.", "frequency": "Daily", "group": "mind", "image": "lib-morning-sunlight"},
  {"id": "lib-grounding", "name": "Grounding / Earthing", "description": "Bare feet on grass, soil, sand, or any natural earth surface for a minimum of 10 minutes.", "frequency": "Daily", "group": "mind", "image": "lib-grounding"},
  {"id": "lib-screen-free-morning", "name": "Screen-Free Morning (30 min)", "description": "No phone, no social media, no email for the first 30 minutes after waking.", "frequency": "Daily", "group": "mind", "image": "lib-screen-free-morning"},
  {"id": "lib-nature-time", "name": "Nature Time (20+ min)", "description": "Walk, sit, or move in a park, bush, beach, or garden — not just walking on footpaths.", "frequency": "Daily", "group": "mind", "image": "lib-nature-time"},
  {"id": "lib-intentional-rest", "name": "Intentional Rest (NSDR)", "description": "10–20 minutes of eyes-closed stillness, yoga nidra, or simply lying down — not sleeping.", "frequency": "Daily", "group": "mind", "image": "lib-intentional-rest"},
  {"id": "lib-cold-exposure", "name": "Cold Exposure (graduated)", "description": "Cold shower (finish last 30–60 seconds cold) or cold plunge. Start with 15 seconds, build to 2–3 minutes.", "frequency": "Daily", "group": "mind", "image": "lib-cold-exposure"},
  {"id": "lib-fasting-window", "name": "12–14 Hour Overnight Fast", "description": "Stop eating 2–3 hours before bed. The overnight fast of 12–14 hours is the baseline human metabolic rhythm.", "frequency": "Daily", "group": "mind", "image": "lib-fasting-window"},
  {"id": "lib-tongue-scraping", "name": "Tongue Scraping", "description": "Scrape the tongue from back to front 7–14 times with a copper scraper before anything else in the morning.", "frequency": "Daily", "group": "mind", "image": "lib-tongue-scraping"},
  {"id": "lib-oil-pulling", "name": "Oil Pulling", "description": "Swish 1 tablespoon of cold-pressed sesame or coconut oil around the mouth for 5–20 minutes, then spit into a bin.", "frequency": "Daily", "group": "mind", "image": "lib-oil-pulling"},
  {"id": "lib-abhyanga", "name": "Abhyanga (Self-Massage with Oil)", "description": "Warm sesame oil and massage the entire body — long strokes on limbs, circular on joints. 5–15 minutes before shower.", "frequency": "Daily", "group": "mind", "image": "lib-abhyanga"},
  {"id": "lib-nasya", "name": "Nasya (Nasal Oil Application)", "description": "Apply 2–3 drops of warm sesame or Nasya oil to each nostril, then sniff gently. 30 seconds total.", "frequency": "Daily", "group": "mind", "image": "lib-nasya"},
  {"id": "lib-nasal-breathing", "name": "Nasal Breathing Practice", "description": "5 minutes of intentional nasal-only breathing upon waking — can be combined with sun exposure.", "frequency": "Daily", "group": "mind", "image": "lib-nasal-breathing"},
  {"id": "lib-dry-brushing", "name": "Dry Brushing", "description": "Brush skin in long strokes toward the heart for 2–5 minutes before showering.", "frequency": "Daily", "group": "mind", "image": "dry-body-brushing"},
  {"id": "lib-morning-journal", "name": "Morning Journal (5 min)", "description": "Write freely for 5 minutes — thoughts, intentions, gratitude. No structure needed.", "frequency": "Daily", "group": "mind", "image": "lib-morning-journal"},
  {"id": "lib-movement-snack", "name": "Movement Snack (10 min)", "description": "10 minutes of intentional movement: brisk walk, stretching, body weight exercises, or dance.", "frequency": "Daily", "group": "move", "image": "lib-movement-snack"},
  {"id": "lib-midday-walk", "name": "Midday Walk (15 min)", "description": "Step outside for 15 minutes at midday — sunlight exposure, movement, and mental reset.", "frequency": "Daily", "group": "move", "image": "lib-midday-walk"},
  {"id": "lib-screen-break-20-20-20", "name": "Screen Break (20-20-20 Rule)", "description": "Every 20 minutes, look at something 20 feet away for 20 seconds. Stand and stretch every hour.", "frequency": "Hourly at desk", "group": "mind", "image": "lib-screen-break-20-20-20"},
  {"id": "lib-protein-lunch", "name": "Protein-Rich Lunch", "description": "Ensure lunch includes at least 25–35g of protein to support afternoon energy and reduce cravings.", "frequency": "Daily", "group": "food", "image": "lib-protein-lunch"},
  {"id": "lib-desk-stretch", "name": "5-Minute Desk Stretch", "description": "Neck rolls, shoulder rolls, chest opener, hip flexor stretch, spinal twist — done at your desk.", "frequency": "Daily", "group": "move", "image": "lib-desk-stretch"},
  {"id": "lib-herbal-tea", "name": "Herbal Tea (Chamomile or Valerian)", "description": "One cup of chamomile or valerian root tea 30–60 minutes before bed.", "frequency": "Daily", "group": "food", "image": "lib-herbal-tea"},
  {"id": "lib-consistent-sleep-time", "name": "Consistent Sleep & Wake Time", "description": "Aim to be in bed and wake at the same time every day — even on weekends, within ±30 minutes.", "frequency": "Daily", "group": "mind", "image": "lib-consistent-sleep-time"},
  {"id": "lib-evening-journal", "name": "Evening Reflection (5 min)", "description": "Write 3–5 sentences about your day: what went well, what you're letting go of, one intention for tomorrow.", "frequency": "Daily", "group": "mind", "image": "lib-evening-journal"},
  {"id": "lib-no-food-before-sleep", "name": "No Food 2 Hours Before Sleep", "description": "Stop eating at least 2 hours before your usual bedtime.", "frequency": "Daily", "group": "food", "image": "lib-no-food-before-sleep"},
  {"id": "lib-connect-loved-one", "name": "Connect with Someone You Love", "description": "A real conversation, a hug, a phone call — not a text. 10+ minutes of genuine connection.", "frequency": "Daily", "group": "mind", "image": "lib-connect-loved-one"},
  {"id": "lib-read-book", "name": "Read (Not on Phone)", "description": "Read a physical book or e-reader (not phone) for at least 15–20 minutes.", "frequency": "Daily", "group": "mind", "image": "lib-read-book"},
];
