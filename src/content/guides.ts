/**
 * House guides for the guest screen.
 *
 * One entry per property, transcribed from the printed PDF guide so the bench
 * screen can show it as something you tap through instead of a PDF to pinch
 * and zoom. Static data: it ships with the app and works offline.
 */

export type GuideBlock =
  | { kind: "text"; text: string }
  | { kind: "facts"; facts: { label: string; value: string; note?: string }[] }
  | { kind: "steps"; title?: string; steps: { title: string; text?: string }[] }
  | { kind: "bullets"; title?: string; items: string[] }
  | { kind: "cards"; title?: string; cards: { title: string; text: string }[] }
  | { kind: "checklist"; items: string[] }
  | { kind: "callout"; title?: string; text: string }
  | { kind: "links"; links: { label: string; href: string; note?: string }[] };

export interface GuideSection {
  id: string;
  title: string;
  emoji: string;
  blocks: GuideBlock[];
}

export interface Guide {
  id: string;
  name: string;
  subtitle: string;
  address: string;
  host: { names: string; phone: string; email: string };
  sections: GuideSection[];
}

const SITE = "https://www.carlsonproperties.co.nz";

export const FIVE_LENS_WAY: Guide = {
  id: "five-lens-way",
  name: "5 Lens Way",
  subtitle: "Acacia Bay · Taupō",
  address: "5 Lens Way, Acacia Bay, Taupō",
  host: { names: "Matt & Ash", phone: "027 697 7961", email: "bookings@carlsonproperties.co.nz" },
  sections: [
    {
      id: "welcome",
      title: "Welcome",
      emoji: "🏡",
      blocks: [
        { kind: "text", text: "Welcome to 5 Lens Way." },
        {
          kind: "text",
          text: "This is our family home. We open it up when we're travelling, and we're so glad to share it with you. Because we live here, it has been properly lived in: a well-equipped kitchen, furniture we chose for ourselves, a garage we turned into a wellness room, and our children's toys and books. Enjoy them all.",
        },
        {
          kind: "text",
          text: "We only ask that you treat the house as you would a friend's, and put things back where you found them. If anything is off or missing, tell us now rather than in your review — we would much rather fix it while you're here.",
        },
        { kind: "facts", facts: [{ label: "Call or text", value: "027 697 7961" }, { label: "Email", value: "bookings@carlsonproperties.co.nz" }] },
        { kind: "text", text: "Matt & Ash, your hosts." },
      ],
    },
    {
      id: "arrival",
      title: "Arrival",
      emoji: "🔑",
      blocks: [
        { kind: "facts", facts: [{ label: "Check-in from", value: "3pm", note: "Self check-in, so arrive whenever suits you after 3." }, { label: "Check-out by", value: "10am", note: "There's a short checklist on the Check-out page." }] },
        { kind: "callout", title: "Your lockbox code", text: "The house key is in the lockbox. We send you the code in your booking messages before you arrive." },
        {
          kind: "steps",
          title: "Letting yourself in",
          steps: [
            { title: "Open the lockbox", text: "Enter the code from your booking messages and open the lockbox." },
            { title: "Take the key", text: "The house key is inside. Close the lockbox and scramble the numbers behind you." },
            { title: "Let yourself in", text: "The house is ready from 3pm." },
            { title: "Keep the key with you", text: "Take it with you when you go out, and put it back in the lockbox when you leave." },
          ],
        },
        { kind: "cards", cards: [{ title: "Go easy on the water", text: "The house runs on tank water and a septic system." }, { title: "Plenty of parking", text: "There's ample off-street parking on the drive." }, { title: "Get online", text: "The Wi-Fi details are in the printed guide at the house." }] },
        { kind: "text", text: "Look for the stone gabion with the big 5 at the end of the drive." },
      ],
    },
    {
      id: "wifi",
      title: "Wi-Fi & TV",
      emoji: "📶",
      blocks: [
        { kind: "callout", title: "Wi-Fi", text: "The network name and password are in the printed guide at the house, along with a code you can scan to join." },
        {
          kind: "text",
          text: "There's a TV in the lounge, the kids' lounge, the master bedroom and the garage. If you sign in to your own streaming accounts, please remember to sign out before you leave.",
        },
      ],
    },
    {
      id: "house",
      title: "The house",
      emoji: "🛋️",
      blocks: [
        { kind: "text", text: "A lived-in family home with countryside views, a glimpse of the lake through the trees, and a garage we turned into a wellness room." },
        {
          kind: "bullets",
          title: "Around the house",
          items: [
            "A kitchen and scullery, with the coffee machine in the scullery",
            "Washing machine and dryer in the laundry",
            "An office with two desks",
            "A kids' lounge and a craft room",
            "Children's toys and books",
            "Bikes in the garage",
          ],
        },
      ],
    },
    {
      id: "sleep",
      title: "Where you'll sleep",
      emoji: "🛏️",
      blocks: [
        { kind: "text", text: "Five bedrooms for up to ten guests: eight bed spaces in four rooms, plus the kids' lounge." },
        {
          kind: "bullets",
          items: [
            "Bedroom 1 — super king, with ensuite",
            "Bedroom 2 — super king",
            "Bedroom 3 — super king",
            "Bedroom 4 — super king",
            "Bedroom 5 — the kids' lounge: two mattresses go on the floor",
          ],
        },
        { kind: "text", text: "There's a main bathroom with a bath, an ensuite off bedroom 1, and a separate toilet." },
        { kind: "text", text: "Prefer singles? Every super king zips apart into two single beds if you need them. More than ten? You're welcome, if you bring airbeds and linen for the extras." },
      ],
    },
    {
      id: "amenities",
      title: "Amenities",
      emoji: "✨",
      blocks: [
        {
          kind: "bullets",
          title: "Kitchen & living",
          items: [
            "Kitchen island with three stools",
            "Dining that seats the whole group",
            "Scullery with the coffee machine and toaster",
            "Fridge with a water dispenser",
            "Main lounge with a big TV",
            "Ducted heating throughout",
            "Laundry with washer and dryer",
          ],
        },
        {
          kind: "bullets",
          title: "Work & play",
          items: ["Office with two desks", "Kids' lounge with a TV", "Craft room with a digital piano", "Children's toys and books", "Playground and trampoline", "Bikes to use"],
        },
        {
          kind: "bullets",
          title: "Garage & outdoors",
          items: [
            "Infrared sauna",
            "Cedar ice bath",
            "Gym with weights, a rack, a treadmill and a pilates reformer",
            "A lounge corner and desk in the garage",
            "Covered patio with a BBQ and lounge suite",
            "Spa pool under the covered patio",
            "Outdoor dining with lake views",
            "A big lawn with countryside views",
          ],
        },
      ],
    },
    {
      id: "finding",
      title: "Finding us",
      emoji: "📍",
      blocks: [
        { kind: "facts", facts: [{ label: "The address", value: "5 Lens Way", note: "Acacia Bay, Taupō. A quiet cul-de-sac with countryside views." }] },
        { kind: "text", text: "Look for the stone gabion with the big 5 at the end of the drive." },
        { kind: "links", links: [{ label: "Open in Google Maps", href: "https://www.google.com/maps/search/?api=1&query=5+Lens+Way+Acacia+Bay+Taupo" }] },
      ],
    },
    {
      id: "know",
      title: "Things to know",
      emoji: "💡",
      blocks: [
        { kind: "callout", title: "Tank water and a septic system", text: "The house isn't on town water or sewerage. It runs on rain-water tanks and a septic tank, so every drop counts." },
        {
          kind: "bullets",
          items: ["Keep showers short.", "Run the dishwasher and washing machine with full loads.", "Only toilet paper goes down the toilet.", "Sanitary items go in the bin, never the toilet."],
        },
        { kind: "cards", cards: [
          { title: "Heating", text: "Ducted throughout. COOL at 16–18°, HEAT at 22–23°." },
          { title: "Bins", text: "Collection is Monday. Take the wheelie bin and the recycling bin down to the end of the driveway, on the cul-de-sac." },
          { title: "Laundry", text: "Washing machine and dryer are in the laundry. Full loads, please, to save water." },
          { title: "TVs", text: "In the lounge, the kids' lounge, the master bedroom and the garage. Sign out of streaming accounts before you leave." },
        ] },
        { kind: "callout", title: "Our children's toys", text: "We've left our children's toys and books for you to enjoy. Please be gentle with them, and put everything back in the same spot when you're finished — it makes a real difference to our cleaners on changeover day." },
        { kind: "cards", cards: [
          { title: "The garage", text: "Sauna, ice bath, gym and reformer. Children must be supervised in the garage." },
          { title: "Bikes", text: "The bikes in the garage are yours to use while you stay. Take extra care with the motorbike." },
          { title: "Playground", text: "The playground and trampoline are in the back yard. Keep an eye on little ones." },
          { title: "Spa pool", text: "Keep the cover on whenever it isn't in use, and always supervise children around it." },
        ] },
        { kind: "text", text: "Accidents happen. If something gets broken or spilled, please tell us, even if you've cleaned it up. We'd much rather repair it than find it hidden." },
      ],
    },
    {
      id: "heating",
      title: "Heating & water",
      emoji: "🌡️",
      blocks: [
        {
          kind: "steps",
          title: "The ducted heating",
          steps: [
            { title: "Turn it on", text: "Switch the ducted system on at the wall controller." },
            { title: "To cool the house", text: "Choose COOL and set it between 16 and 18°." },
            { title: "To warm the house", text: "Choose HEAT and set it between 22 and 23°." },
            { title: "Doors closed", text: "Keep the doors and windows shut while it runs, and turn it off when you go out." },
          ],
        },
        { kind: "callout", title: "Every drop counts", text: "Rain-water tanks and a septic system: short showers, full loads in the dishwasher and washing machine, only toilet paper down the toilet, and sanitary items in the bin." },
      ],
    },
    {
      id: "sauna",
      title: "Sauna & ice bath",
      emoji: "🧖",
      blocks: [
        {
          kind: "steps",
          title: "Helsinki infrared sauna",
          steps: [
            { title: "Turn it on", text: "Wake the TouchPro panel and switch the sauna on. Set your time on the panel." },
            { title: "Set your heat", text: "Each seat has its own ThermaDial, so everyone can set their own heater." },
            { title: "Let it warm up", text: "Give it about 15 minutes before you hop in." },
            { title: "Lights and music", text: "Pick a colour for the lights, and connect your phone to the Bluetooth speakers." },
            { title: "Switch off", text: "Turn it off at the panel when you're done, and leave the door open a little to air it out." },
          ],
        },
        { kind: "bullets", items: ["Take a towel to sit on.", "Drink plenty of water.", "Fifteen to twenty minutes is plenty."] },
        {
          kind: "steps",
          title: "Apollo XL cedar ice bath",
          steps: [
            { title: "Check the temperature", text: "The chiller keeps the water cold and shows the temperature on its touchscreen." },
            { title: "Lift the cover", text: "Take off the insulated cover and put it somewhere clean." },
            { title: "Rinse first", text: "A quick rinse beforehand keeps the water clean for longer." },
            { title: "Ease in", text: "Lower yourself in slowly and breathe steadily. If you're new to it, one to three minutes is plenty." },
            { title: "Cover it again", text: "Put the cover back on as soon as you're out, so the water stays cold and clean." },
          ],
        },
        { kind: "text", text: "Never use the ice bath alone or after drinking, and keep children out unless an adult is right there with them." },
      ],
    },
    {
      id: "spa",
      title: "The spa pool",
      emoji: "💦",
      blocks: [
        { kind: "text", text: "The spa has a cover lifter, so one person can take the cover off without carrying its weight." },
        {
          kind: "steps",
          title: "Taking the cover off",
          steps: [
            { title: "Unclip the cover", text: "If the cover is clipped down at the sides, undo the clips first." },
            { title: "Fold it in half", text: "Lift the front edge and fold the cover back over onto itself, so it rests on the lifter bar." },
            { title: "Tip it back", text: "Push the folded cover back. The lifter arms pivot and stand it up behind the spa." },
          ],
        },
        {
          kind: "steps",
          title: "Putting it back on",
          steps: [
            { title: "Bring it over", text: "Pull the cover forward on the lifter until it lies folded on top of the spa." },
            { title: "Unfold it", text: "Open the front half out flat so the whole spa is covered." },
            { title: "Clip it down", text: "Do up any side clips so the cover stays put." },
          ],
        },
        { kind: "bullets", title: "Look after the cover", items: ["Keep the cover on whenever the spa isn't in use.", "Never sit, stand or let children climb on the cover.", "Don't drag the cover off the side. That's how covers tear and backs get hurt."] },
        { kind: "bullets", title: "Staying safe", items: ["Always supervise children in and around the spa.", "Don't use the spa alone or after drinking.", "No glass in or around the spa.", "Fifteen to twenty minutes at a time is plenty."] },
      ],
    },
    {
      id: "gym",
      title: "Reformer, gym & bikes",
      emoji: "🏋️",
      blocks: [
        { kind: "text", text: "New to a reformer? Start slow, with light springs." },
        {
          kind: "steps",
          title: "The reformer",
          steps: [
            { title: "Start light", text: "Hook on one or two springs to begin with. Add more once you're comfortable." },
            { title: "Get on and off safely", text: "Only step on or off when the carriage is resting against the stopper." },
            { title: "Change springs at rest", text: "Bring the carriage all the way home before you add or take off springs." },
            { title: "Finish tidy", text: "Return the carriage home, hang the straps back up and wipe down the carriage." },
          ],
        },
        { kind: "bullets", title: "The gym", items: ["Re-rack the weights when you're done.", "Wipe down anything you've used.", "Unplug the treadmill after use.", "Children must be supervised in the garage."] },
        { kind: "callout", title: "Help yourself to the bikes", text: "The bikes in the garage are there for you to use. Please put them back when you're finished. Take extra care with the motorbike: set the speed to suit the rider before every ride, and always wear a helmet." },
      ],
    },
    {
      id: "rules",
      title: "House rules",
      emoji: "📋",
      blocks: [
        { kind: "text", text: "A few friendly reminders, so our home stays lovely for you and for everyone after you." },
        {
          kind: "steps",
          steps: [
            { title: "No smoking inside", text: "The house is smoke-free. Please smoke outdoors only, and put any butts in the bin." },
            { title: "Our family home", text: "Please be respectful of our things, and put the children's toys back in the same spot when you're finished." },
            { title: "Only toilet paper down the toilet", text: "We're on a septic system. Sanitary items go in the bin." },
            { title: "Go easy on the water", text: "The house runs on tank water. Short showers and full loads, please." },
            { title: "The garage", text: "Children must be supervised in the garage. Never use the sauna or ice bath alone." },
            { title: "Quiet hours, 10pm to 7am", text: "Please help keep the cul-de-sac peaceful by keeping noise down overnight." },
            { title: "Put the furniture back", text: "Move anything you like to suit how you're using the house. Just put it back where you found it before you go." },
          ],
        },
      ],
    },
    {
      id: "emergency",
      title: "In an emergency",
      emoji: "🚑",
      blocks: [
        { kind: "facts", facts: [{ label: "Police, fire or ambulance", value: "Call 111", note: "The address to give them: 5 Lens Way, Acacia Bay, Taupō." }] },
        { kind: "text", text: "Fire extinguisher and first aid kit are both kept under the kitchen sink." },
        {
          kind: "cards",
          cards: [
            { title: "Medical centre", text: "117 Te Heuheu Street · 07 378 4080" },
            { title: "Hospital", text: "38 Kōtare Street, Hilltop · 07 376 1000" },
            { title: "Pharmacy", text: "57 Tongariro Street · 07 378 5205" },
            { title: "Police, fire & ambulance", text: "21 Story Place · Dial 111" },
          ],
        },
        { kind: "cards", cards: [
          { title: "If the smoke alarm sounds", text: "Get everyone out of the house, close the doors behind you if it's safe to, and call 111 from outside." },
          { title: "If there's an earthquake", text: "Drop, cover and hold: get down, take cover under something sturdy like the dining table, and hold on until the shaking stops." },
        ] },
        { kind: "text", text: "Anything else, call your hosts, Matt & Ash, on 027 697 7961." },
      ],
    },
    {
      id: "do",
      title: "Things to do",
      emoji: "🎈",
      blocks: [
        { kind: "text", text: "Acacia Bay sits on the western side of the lake, a short drive from town." },
        {
          kind: "cards",
          title: "Adults — relax & indulge",
          cards: [
            { title: "Wairakei Terraces", text: "Thermal baths, for 14 years and over." },
            { title: "Kinloch Golf Course", text: "Rated one of NZ's best courses." },
            { title: "Craters Mountain Bike Park", text: "50 km of purpose-built trails." },
            { title: "Confinement", text: "Escape rooms for groups." },
            { title: "BFT Taupō", text: "Casual gym passes." },
            { title: "Doughboats", text: "Hire a boat for six and order a platter." },
            { title: "Walk Mt Tauhara", text: "A steep 2.5 km climb to the 1,088 m summit." },
            { title: "Living Waters Spa", text: "Massage at DeBretts thermal pools." },
            { title: "Rangatira Point Track", text: "A 20 minute walk, then jump off the rocks." },
          ],
        },
        {
          kind: "cards",
          title: "Teens — adventure",
          cards: [
            { title: "Whakapapa, Mt Ruapehu", text: "Ski and snowboard." },
            { title: "The Landing", text: "Trampoline park, ninja course, bowling." },
            { title: "The Cave", text: "Virtual reality and simulator racing." },
            { title: "Swingers", text: "Mini golf." },
            { title: "AC Baths", text: "Public swimming pools." },
            { title: "Pedal Boats", text: "Pedal boat hire at Wharewaka." },
            { title: "Taupō Watersports", text: "Banana boat rides." },
            { title: "The Edge Rockwall", text: "Indoor climbing at AC Baths." },
            { title: "Bike Park", text: "BMX track at Spa Park." },
          ],
        },
        {
          kind: "cards",
          title: "Little ones — explore",
          cards: [
            { title: "Tongariro Playground", text: "Right in the town centre." },
            { title: "Toddler Time Gymnastics", text: "Casual classes, Saturdays 9:15am." },
            { title: "The Landing", text: "Indoor playground, trampolines, arcade." },
            { title: "Mind Junction", text: "Maze, discovery centre and Lego." },
            { title: "Lilliput Farm", text: "Animal park." },
            { title: "Fairy Garden", text: "Whangamata Stream Walk, Kinloch." },
            { title: "Rock hunting", text: "Collect rocks in the Botanical Gardens." },
            { title: "Huka Prawn Park", text: "Fish for prawns, plus water play." },
            { title: "Lions Walk", text: "Wide lakefront paths for bikes and scooters." },
          ],
        },
        { kind: "links", links: [{ label: "Links, opening hours and booking", href: `${SITE}/guest-info` }] },
      ],
    },
    {
      id: "eat",
      title: "Places to eat",
      emoji: "🍽️",
      blocks: [
        { kind: "text", text: "Book ahead for the weekend, especially in summer." },
        {
          kind: "cards",
          cards: [
            { title: "The Bistro", text: "Bistro. There's a reason the reviews are so good: everything on the menu is delicious." },
            { title: "The Brantry", text: "Fine dining. Great atmosphere and private dining." },
            { title: "Embra", text: "Set menu. A celebration of modern Kiwi food, cooked with French and British technique. Three or five courses." },
            { title: "Bistro Lago at The Hilton", text: "From lake, land and ocean to your plate. À la carte lunch and dinner, and high tea." },
            { title: "The Plateau", text: "Since 2004. Locally owned and operated, and it has truly stood the test of time." },
            { title: "Lionels", text: "Modern dining. Great atmosphere, impressive food and outstanding quality." },
            { title: "Roquette", text: "Modern dining. Big flavours and beautiful presentation." },
            { title: "Incredible India", text: "Indian, takeaway. Our pick of Taupō's Indian restaurants. Takeaway and delivery too." },
            { title: "Sorrento", text: "Italian wine bar. Italian dining and a wine bar, with a takeaway menu." },
          ],
        },
        { kind: "links", links: [{ label: "Menus, photos and links", href: `${SITE}/guest-info` }] },
      ],
    },
    {
      id: "cafes",
      title: "Cafés",
      emoji: "☕",
      blocks: [
        { kind: "text", text: "For the morning coffee you didn't make at home, and the cake you didn't plan on." },
        {
          kind: "cards",
          cards: [
            { title: "Cafe Baku", text: "Roberts Street. On the lakefront, open daily from 7am." },
            { title: "Replete", text: "Heuheu Street. Opened in 1993 and still run by its original owners." },
            { title: "The Cozy Corner", text: "Tamamutu Street. Perfect for vegetarians and vegans, with plenty of healthy choices." },
            { title: "L'Arté Café & Gallery", text: "Acacia Bay. Wander the garden paths of art and creativity. Closed Mondays and Tuesdays." },
            { title: "The Storehouse", text: "Runanga Street. Takes private bookings and does catering." },
            { title: "Industrie", text: "Napier Highway. Taupō's French-inspired kitchen and patisserie, next to Mitre 10." },
            { title: "Baked With Love", text: "Gascoigne Street. Love food, love coffee, love Taupō. There's a cakery on site for special occasions." },
            { title: "Kefi & Kefi", text: "Horomatangi Street. At Kokomea, next to the new supermarket. Dairy-free, gluten-free and vegan options." },
            { title: "Victoria's Cafe", text: "Tongariro Street. Opposite the Tongariro Domain. Great coffee, fresh food and a funky, eclectic interior." },
          ],
        },
        { kind: "links", links: [{ label: "Menus, photos and links", href: `${SITE}/guest-info` }] },
      ],
    },
    {
      id: "drink",
      title: "Places to drink",
      emoji: "🍻",
      blocks: [
        { kind: "text", text: "Lake views, beer gardens and a proper pub or two. Please don't drink and drive." },
        {
          kind: "cards",
          cards: [
            { title: "2Mile Sailing Club", text: "On the lake. Taupō's only bar right on the lake. Pizzas, a great atmosphere, licensed until 10pm." },
            { title: "Finns", text: "Bistro & beer garden. Covered outdoor seating. Kid friendly, with kids' meals and colouring packs." },
            { title: "Vine Eatery & Bar", text: "Tapas & cocktails. A tapas menu and a cocktail bar, with private rooms for larger groups." },
            { title: "The Deck", text: "Lake views. Pool tables and Sky Sport. Burgers and pizzas." },
            { title: "Lonestar", text: "Mezzanine. Upstairs seats up to 55 with its own bar. Outside deck, fireplace and Sky Sport." },
            { title: "Jolly Good Fellows", text: "Lakefront pub. British pub-style meals with big portions." },
            { title: "Mavericks", text: "Gastropub. A little further from town, with strong drinks and entertainment at the ready." },
            { title: "Pub N Grub", text: "Town centre. Outdoor seating and classic pub food." },
            { title: "Jimmy Coops", text: "Brewery. Home of Taupō's own Lakeman Craft Beer. A casual brewery on the lakefront." },
          ],
        },
        { kind: "links", links: [{ label: "Menus, photos and links", href: `${SITE}/guest-info` }] },
      ],
    },
    {
      id: "checkout",
      title: "Check-out",
      emoji: "👋",
      blocks: [
        { kind: "text", text: "Check-out is at 10am, so our cleaners have the time they need to get the house ready again." },
        {
          kind: "checklist",
          items: [
            "Load and start the dishwasher",
            "Turn off the lights, the ducted heating and appliances",
            "Turn off the sauna, and put the cover back on the ice bath and the spa",
            "Put the toys and books back where you found them",
            "Put the bikes back in the garage",
            "Put the rubbish in the wheelie bin",
            "Close and lock all the windows and doors",
            "Put the key back in the lockbox and scramble the code",
            "Strip the beds if you can. It's not required, but it really helps",
          ],
        },
        { kind: "text", text: "Rubbish collection is on Monday. If you're here on a Sunday night, please take the wheelie bin and the recycling bin down to the cul-de-sac." },
      ],
    },
    {
      id: "comeback",
      title: "Come back",
      emoji: "🤍",
      blocks: [
        { kind: "text", text: "Lens Way is only available when we're travelling, so dates open up now and then. Ask us and we'll tell you honestly whether yours work." },
        { kind: "facts", facts: [{ label: "Email", value: "bookings@carlsonproperties.co.nz" }, { label: "Call or text", value: "027 697 7961" }] },
        {
          kind: "cards",
          title: "Our other houses",
          cards: [
            { title: "One Eleven on the Mile", text: "Lake views, a heated pool, a sauna and a spa, in Nukuhau." },
            { title: "13 Sedge Grove", text: "A covered patio, a games garage and room for the boat, in Nukuhau." },
          ],
        },
        { kind: "links", links: [{ label: "See our other houses", href: SITE }] },
      ],
    },
  ],
};

export const GUIDES: Record<string, Guide> = { [FIVE_LENS_WAY.id]: FIVE_LENS_WAY };

/** The guide a guest screen should show. One property for now. */
export const DEFAULT_GUIDE = FIVE_LENS_WAY;
