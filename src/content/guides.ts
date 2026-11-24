/**
 * House guides for the guest screen.
 *
 * One entry per property, laid out like the One Eleven digital guidebook on
 * carlsonproperties.co.nz: a handful of chapters, each with a photo, and
 * sub-tabs where a chapter covers several things (how-tos, places to eat).
 * The words for 5 Lens Way come from its printed PDF guide; the photos come
 * from the booking site's "Website Media" bucket, and the places reuse One
 * Eleven's photos and links where they're the same place.
 *
 * Static data: it ships with the app. Photos are cached by the service worker
 * after the first view, and anything that fails to load falls back to a plain
 * panel, so the guide always works.
 */

export interface GuideCard {
  title: string;
  text: string;
  image?: string;
  /** Shown as a QR code to open on a phone (the hub is a wall screen). */
  href?: string;
}

export interface GuideTab {
  label: string;
  emoji?: string;
  image?: string;
  blocks: GuideBlock[];
}

export type GuideBlock =
  | { kind: "text"; text: string }
  | { kind: "quote"; text: string; signature?: string }
  | { kind: "facts"; facts: { label: string; value: string; note?: string }[] }
  | { kind: "steps"; title?: string; steps: { title: string; text?: string }[] }
  | { kind: "bullets"; title?: string; items: string[] }
  | { kind: "cards"; title?: string; cards: GuideCard[] }
  | { kind: "checklist"; items: string[] }
  | { kind: "callout"; title?: string; text: string }
  | { kind: "call"; number: string; label: string; note?: string }
  | { kind: "gallery"; photos: { src: string; caption: string }[] }
  | { kind: "tabs"; tabs: GuideTab[] }
  | { kind: "links"; links: { label: string; href: string; note?: string }[] };

export interface GuideSection {
  id: string;
  title: string;
  emoji: string;
  /** The big heading on the page, when it differs from the chapter name. */
  heading?: string;
  image?: string;
  blocks: GuideBlock[];
}

export interface Guide {
  id: string;
  name: string;
  /** Small label above every heading, e.g. "5 Lens Way | Acacia Bay". */
  eyebrow: string;
  subtitle: string;
  address: string;
  mapUrl: string;
  /** The printed guide, for the QR code guests scan to take it with them. */
  pdfUrl?: string;
  host: { names: string; phone: string; email: string };
  /** One-tap chips under the title that jump to a chapter. */
  essentials: { label: string; emoji: string; section: string }[];
  sections: GuideSection[];
}

const SITE = "https://www.carlsonproperties.co.nz";

/** A photo in the booking site's public "Website Media" bucket. */
function media(path: string): string {
  const seg = (s: string) => encodeURIComponent(s).replace(/%2C/g, ",");
  return `https://hxprmevheigajzqehjgf.supabase.co/storage/v1/object/public/${seg("Website Media")}/${path.split("/").map(seg).join("/")}`;
}
const lens = (file: string) => media(`5 Lens Way/${file}`);

const PHOTO = {
  exterior: lens("lens-exterior.jpeg"),
  lounge: lens("lens-lounge.jpeg"),
  kitchen: lens("lens-kitchendining.jpeg"),
  scullery: lens("lens-skullery.jpeg"),
  patio: lens("lens-coveredpatio.png"),
  garage: lens("lens-garage.png"),
  master: lens("lens-masterbed.jpeg"),
  bed2: lens("lens-bedroom2.jpeg"),
  bed3: lens("lens-bedroom3.jpeg"),
  bed4: lens("lens-bedroom4.jpeg"),
  kidsLounge: lens("lens-bedroom5/kidslounge.png"),
  ensuite: lens("lens-ensuite.jpeg"),
  bathroom: lens("lens-bathroom.jpeg"),
  office: lens("lens-office.jpeg"),
  kidsOffice: lens("lens-kidsoffice.png"),
  outdoorDining: lens("lens-outdoordining.png"),
  playground: lens("lens-playground.jpeg"),
  views: lens("lens-countryviews.jpeg"),
  laundry: lens("lens-laundry.jpeg"),
};

/* Places: photos and links shared with the One Eleven guide. */
const P = {
  wairakei: { href: "https://wairakeiterraces.co.nz", image: "https://static.wixstatic.com/media/5813b5_556156fabae84a70a4d6893eec144ba3~mv2.jpg/v1/fill/w_1200,h_800,al_c,q_85,enc_avif,quality_auto/5813b5_556156fabae84a70a4d6893eec144ba3~mv2.jpg" },
  kinloch: { href: "https://kinlochgolf.co.nz", image: "https://www.thekinlochclub.com/media/1749/kinlochclubtauponz-18th-green-12-950-633px.jpg?mode=crop&width=1200&height=700&quality=80" },
  craters: { href: "https://cratersofthemoon.co.nz/mountain-bike-park", image: "https://www.lovetaupo.com/media/pvfhf23n/bas-vaea-at-craters-mtb-park.FrwVMA.jpg?width=1200" },
  confinement: { href: "https://confinement.co.nz", image: "https://veronikasadventure.com/wp-content/uploads/2023/12/escape-room-experience-taupo-the-wild-tea-party.jpg" },
  bft: { href: "https://www.bodyfittraining.com/club/taupo", image: "https://bookmestatic.net.nz/bookme-product-images/products/9058/9058_image4_IOTZQkEhmo_TUBU_Untitled2.jpg" },
  doughboats: { href: "https://doughboats.co.nz", image: "https://media-cdn.tripadvisor.com/media/attractions-splice-spp-720x480/0b/28/5b/20.jpg" },
  tauhara: { href: "https://www.doc.govt.nz/parks-and-recreation/places-to-go/waikato/places/taupo-area/things-to-do/tracks/mount-tauhara-track/", image: "https://longwhitegypsy.com/wp-content/uploads/2018/04/Mt-Tauhara-Guide-Featured-Image.jpg" },
  debretts: { href: "https://www.debretts.co.nz", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSQVMbUfE0ylQjUQdsWQHnBoGcP2rliKBE35A&s" },
  rangatira: { href: "https://www.tauponz.com/explore/walks-and-hikes/rangatira-point-track/", image: "https://admin.planmywalk.nz/assets/UserReviewImages/5a39c927682401599000fc0e2e802bcc515c96e3__FocusFillWyIwLjAwIiwiMC4wMCIsMTkyMCw2MDBd.jpeg" },
  rockwall: { href: "https://www.tauponz.com/visit/things-to-do/the-edge-rockwall/", image: "https://www.lovetaupo.com/remote.axd?https://register.newzealand.com/sites/default/files/product_images/2022-07/Rockwall%20hanging.jpg?width=1200" },
  ruapehu: { href: "https://www.mtruapehu.com", image: "https://www.visitruapehu.com/media/Down%20groomer%20-%20Visit%20Ruapehu.jpg" },
  landing: { href: "https://www.thelanding.co.nz", image: "https://images.squarespace-cdn.com/content/v1/66836ec3c5316542ae46e44d/1721165499126-TIP24O548G9TEAH7RUK0/TLDZ-54.jpg" },
  cave: { href: "https://www.thecave.nz", image: "https://images.squarespace-cdn.com/content/v1/647f1ebdc616112036a070db/b089a232-c3b8-44d9-9697-0f839c5dc91c/The+Cave+Virtual+Reality+VR+Games.jpg" },
  swingers: { href: "https://www.swingersputtputt.co.nz", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUZ2Up5Ns0G6O2XAk8s1UQNWO6Dm2ujpmHNw&s" },
  acBaths: { href: "https://www.taupodc.govt.nz/recreation/sport-and-recreation-centres/ac-baths", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzX74Yr2MirQh15RFvCHGBcEVj51SU0gZQ7g&s" },
  pedal: { href: "https://www.taupowatersports.co.nz", image: "https://static.wixstatic.com/media/76de7c_0f0df0ac3942470ba713d82706e24f98~mv2.jpg/v1/fit/w_285,h_190,q_90,enc_avif,quality_auto/76de7c_0f0df0ac3942470ba713d82706e24f98~mv2.jpg" },
  watersports: { href: "https://www.taupowatersports.co.nz", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIweA6C-C2uxNHjv4ME4Uoxva1R1tWFplmcQ&s" },
  spaPark: { href: "https://www.tauponz.com/explore/parks-and-playgrounds/spa-park/", image: "https://www.lovetaupo.com/media/5i1jfxhu/taupo-bike-park-spa-thermal-park.GNsz_A.jpg" },
  tongariro: { href: "https://www.tauponz.com/explore/parks-and-playgrounds/tongariro-domain/", image: "https://www.taupodc.govt.nz/repository/libraries/id:25026fn3317q9slqygym/hierarchy/Council/Projects/Tongariro%20playground/Completed%20playground/DJI_0038.jpg" },
  gymnastics: { href: "https://www.taupogymnastics.co.nz", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTHDN-3efS7tQCgAiltZGor0MzE3bsC3QIaMw&s" },
  mindJunction: { href: "https://www.mindjunction.co.nz", image: "https://www.lovetaupo.com/media/2961883/mind-junction-hero.jpg?width=1200&format=jpg&quality=70" },
  lilliput: { href: "https://www.lilliputfarm.co.nz", image: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/0e/3f/6b/de/photo3jpg.jpg?w=1200&h=-1&s=1" },
  fairy: { href: "https://www.tauponz.com/explore/walks-and-hikes/whangamata-stream-walk/", image: media("fairygardenwalk.jpg") },
  prawn: { href: "https://hukaprawnpark.co.nz", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQl9PO_an7v7KReSljKYAGPceMaW4Y9JSvDDw&s" },
  lions: { href: "https://www.tauponz.com/explore/walks-and-hikes/lions-walk/", image: "https://www.taupo.info/sites/www.taupo.info/files/styles/slideshow__smartport/public/pics/listings/images/lionswalk.jpg?itok=NVUhYhnO" },
  bistro: { href: "https://www.thebistrotaupo.co.nz", image: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/03/90/44/94/the-bistro.jpg?w=900&h=500&s=1" },
  brantry: { href: "https://thebrantry.co.nz", image: "https://dzpdbgwih7u1r.cloudfront.net/96a7138e-4766-48d0-8239-4746c626be5f/9c708dd6-c32c-4e86-82d0-bd01e1b39318/9c708dd6-c983-4847-b7ee-2b3bf57c91a2/w1200h967-7df988c2244435af03de614944530290.png" },
  embra: { href: "https://www.embra.nz", image: "https://www.lovetaupo.com/media/rmqgg30n/embra-food-2-1.GTjohw.png?width=800" },
  lago: { href: "https://www.hilton.com/en/hotels/tnpwaqq-hilton-taupo/dining/", image: "https://media-cdn.tripadvisor.com/media/photo-m/1280/1c/aa/e5/f2/dining-shared-at-bistro.jpg" },
  plateau: { href: "https://theplateau.co.nz", image: "https://plateautaupo.co.nz/wp-content/uploads/2025/06/Plateau-new-menu-05.25-That-Green-Olive-176-1-scaled.jpg" },
  lionels: { href: "https://lionelstaupo.co.nz", image: "https://www.lovetaupo.com/media/id1klt0a/lionels-1-1.jpg?width=1200&format=jpg&quality=70" },
  roquette: { href: "https://roquette.nz", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm9v7kKHOo_eG0cSgeRz58vBON5cs0FsY75A&s" },
  india: { href: "https://www.incredibleindia.nz", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSxlp_VROSQr7n30KWBXh5O4FolXRt_sJ-Dug&s" },
  sorrento: { href: "https://sorrentotaupo.co.nz", image: "https://bookmestatic.net.nz/bookme-product-images/products/7983/7983_image1_3l0T3FMJWC_QSOC_sorrento.jpg" },
  baku: { href: "https://cafebaku.co.nz", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR814SrJG0CR5sNxPmu9BtOlNZUDoJVkpWrQQ&s" },
  replete: { href: "https://repletecafe.nz", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRE8ZE6VAPnncQ3nBgazE_Yqp0Ub-khN5AL4Q&s" },
  cozy: { href: "https://www.thecozycorner.co.nz/", image: "https://dogfriendlynewzealand.co.nz/wp-content/uploads/2021/01/cozy-corner-.jpg" },
  larte: { href: "https://www.lartecafe.co.nz", image: "https://images.squarespace-cdn.com/content/v1/5c062595b98a783e26690c62/1545453228163-GJ8NEADTL6NMTHCRFK48/Westermanos-0588.jpg" },
  storehouse: { href: "https://www.lovetaupo.com/en/operators/the-storehouse-taupo/", image: "https://www.lovetaupo.com/media/2958424/the-storehouse-cafe-coffee-friends-eating-breakfast.jpg" },
  industrie: { href: "https://industrie.co.nz", image: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1b/36/ed/53/counter.jpg?w=400&h=300&s=1" },
  baked: { href: "https://bakedwithlove.co.nz/", image: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1b/18/9d/90/our-shipping-containers.jpg?w=900&h=500&s=1" },
  kefi: { href: "https://www.lovetaupo.com/en/operators/kefi-cafe/", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUuEYYjBII_QQu3YLqDbHSFtEj5Tic_fd9Xg&s" },
  victorias: { href: "https://www.victorias.co.nz", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT90t2oUP5WaZeWTDCaFhROaFqWK3rH8skIdQ&s" },
  twoMile: { href: "https://www.2milebay.co.nz", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT9y3mDeCchrXE4TMDFvFhV23W8bjfXD3g17Q&s" },
  finns: { href: "https://www.finnsbistro.co.nz", image: media("finnsbistro.jpg") },
  vine: { href: "https://www.vineeatery.co.nz", image: "https://www.lovetaupo.com/media/hsidmhmi/vine-eatery-restaurant.jpg" },
  deck: { href: "https://www.thedecktaupo.co.nz", image: "https://www.lovetaupo.com/media/2960018/the-deck-bar-taupo-13.jpg" },
  lonestar: { href: "https://www.lonestar.co.nz/restaurants/taupo", image: "https://www.firsttable.co.nz/_next/image?url=https%3A%2F%2Fimages.firsttable.net%2F1292x800%2Fpublic%2Frestaurant%2F2446d9d000%2FLonestar5642-1.jpg&w=1200&q=60" },
  jolly: { href: "https://www.jollygoodfellows.co.nz", image: "https://www.taupo.info/sites/www.taupo.info/files/styles/full__smartport/public/pics/listings/images/jolly_good_fellows_-_outdoor_seating_new.png?itok=9-BUeGF4" },
  mavericks: { href: "https://www.mavericksgastropub.co.nz/our-story", image: "https://www.taupo.info/sites/www.taupo.info/files/styles/full__smartport/public/pics/listings/images/mavericks_the_landing_2.jpg?itok=3Ef4wy03" },
  pubNGrub: { href: "https://www.pubngrub.co.nz/contact-10", image: "https://static.wixstatic.com/media/707728_6b9c495a410542518fe8e87c57319bd8~mv2.jpg/v1/fill/w_640,h_400,al_c,q_80,enc_avif,quality_auto/707728_6b9c495a410542518fe8e87c57319bd8~mv2.jpg" },
  jimmy: { href: "https://www.jimmycoops.co.nz", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS8TeQWBX8xJYAH3o-XGFL08XBJrvqZ-XQx6g&s" },
} satisfies Record<string, { href: string; image: string }>;

const place = (title: string, text: string, p?: { href: string; image: string }): GuideCard => ({ title, text, ...(p ?? {}) });

export const FIVE_LENS_WAY: Guide = {
  id: "five-lens-way",
  name: "5 Lens Way",
  eyebrow: "5 Lens Way | Acacia Bay",
  subtitle: "Acacia Bay · Taupō",
  address: "5 Lens Way, Acacia Bay, Taupō",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=5+Lens+Way+Acacia+Bay+Taupo",
  pdfUrl: `${SITE}/guides/5-lens-way-house-guide.pdf`,
  host: { names: "Matt & Ash", phone: "027 697 7961", email: "bookings@carlsonproperties.co.nz" },
  essentials: [
    { label: "Wi-Fi", emoji: "📶", section: "arrival" },
    { label: "Lockbox", emoji: "🔑", section: "arrival" },
    { label: "Sauna & spa", emoji: "🧖", section: "howto" },
    { label: "Check-out", emoji: "👋", section: "checkout" },
  ],
  sections: [
    {
      id: "welcome",
      title: "A warm welcome",
      emoji: "🤍",
      heading: "Welcome to 5 Lens Way",
      image: PHOTO.exterior,
      blocks: [
        {
          kind: "quote",
          text: "This is our family home. We open it up when we're travelling, and we're so glad to share it with you. Because we live here, it has been properly lived in: a well-equipped kitchen, furniture we chose for ourselves, a garage we turned into a wellness room, and our children's toys and books. Enjoy them all.",
          signature: "Matt & Ash",
        },
        {
          kind: "text",
          text: "We only ask that you treat the house as you would a friend's, and put things back where you found them. If anything is off or missing, tell us now rather than in your review — we would much rather fix it while you're here.",
        },
        { kind: "facts", facts: [{ label: "Call or text", value: "027 697 7961" }, { label: "Email", value: "bookings@carlsonproperties.co.nz" }] },
      ],
    },
    {
      id: "arrival",
      title: "Arrival & Wi-Fi",
      emoji: "🔑",
      heading: "Getting settled",
      image: PHOTO.views,
      blocks: [
        { kind: "facts", facts: [
          { label: "Check-in from", value: "3pm", note: "Self check-in, so arrive whenever suits you after 3." },
          { label: "Check-out by", value: "10am", note: "There's a short checklist on the Check-out page." },
        ] },
        { kind: "facts", facts: [{ label: "The address", value: "5 Lens Way", note: "Acacia Bay, Taupō. A quiet cul-de-sac with countryside views. Look for the stone gabion with the big 5 at the end of the drive." }] },
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
        { kind: "callout", title: "Wi-Fi", text: "The network name and password are in the printed guide at the house, along with a code you can scan to join. They're also on the welcome screen." },
        { kind: "cards", cards: [
          { title: "Plenty of parking", text: "There's ample off-street parking on the drive." },
          { title: "TVs", text: "In the lounge, the kids' lounge, the master bedroom and the garage. If you sign in to your own streaming accounts, please sign out before you leave." },
        ] },
        { kind: "links", links: [{ label: "Open in Google Maps", href: "https://www.google.com/maps/search/?api=1&query=5+Lens+Way+Acacia+Bay+Taupo" }] },
      ],
    },
    {
      id: "house",
      title: "The house",
      emoji: "🛋️",
      heading: "Make yourselves at home",
      blocks: [
        { kind: "text", text: "A lived-in family home with countryside views, a glimpse of the lake through the trees, and a garage we turned into a wellness room. Five bedrooms for up to ten guests." },
        {
          kind: "tabs",
          tabs: [
            {
              label: "Living",
              emoji: "🍽️",
              blocks: [
                { kind: "gallery", photos: [
                  { src: PHOTO.lounge, caption: "Main lounge" },
                  { src: PHOTO.kitchen, caption: "Kitchen and dining" },
                  { src: PHOTO.scullery, caption: "Scullery" },
                  { src: PHOTO.laundry, caption: "Laundry" },
                ] },
                { kind: "bullets", items: [
                  "Kitchen island with three stools, and dining that seats the whole group",
                  "Scullery with the coffee machine and toaster",
                  "Fridge with a water dispenser",
                  "Main lounge with a big TV, and ducted heating throughout",
                  "Laundry with washer and dryer",
                ] },
              ],
            },
            {
              label: "Bedrooms",
              emoji: "🛏️",
              blocks: [
                { kind: "gallery", photos: [
                  { src: PHOTO.master, caption: "Bedroom 1, with ensuite" },
                  { src: PHOTO.bed2, caption: "Bedroom 2" },
                  { src: PHOTO.bed3, caption: "Bedroom 3" },
                  { src: PHOTO.bed4, caption: "Bedroom 4" },
                  { src: PHOTO.kidsLounge, caption: "Bedroom 5, the kids' lounge" },
                  { src: PHOTO.ensuite, caption: "Ensuite" },
                  { src: PHOTO.bathroom, caption: "Main bathroom" },
                ] },
                { kind: "bullets", items: [
                  "Bedroom 1 — super king, with ensuite",
                  "Bedrooms 2, 3 and 4 — super kings",
                  "Bedroom 5 — the kids' lounge: two mattresses go on the floor",
                  "A main bathroom with a bath, the ensuite, and a separate toilet",
                ] },
                { kind: "text", text: "Prefer singles? Every super king zips apart into two single beds. More than ten? You're welcome, if you bring airbeds and linen for the extras." },
              ],
            },
            {
              label: "Work & play",
              emoji: "🧸",
              blocks: [
                { kind: "gallery", photos: [
                  { src: PHOTO.office, caption: "Office with two desks" },
                  { src: PHOTO.kidsOffice, caption: "Craft room" },
                  { src: PHOTO.playground, caption: "Playground and trampoline" },
                ] },
                { kind: "bullets", items: ["Office with two desks", "Kids' lounge with a TV", "Craft room with a digital piano", "Children's toys and books", "Playground and trampoline", "Bikes to use"] },
              ],
            },
            {
              label: "Garage & outdoors",
              emoji: "🌿",
              blocks: [
                { kind: "gallery", photos: [
                  { src: PHOTO.garage, caption: "The garage: sauna, ice bath and gym" },
                  { src: PHOTO.patio, caption: "Covered patio and spa" },
                  { src: PHOTO.outdoorDining, caption: "Outdoor dining" },
                  { src: PHOTO.views, caption: "Countryside views" },
                ] },
                { kind: "bullets", items: [
                  "Infrared sauna and a cedar ice bath",
                  "Gym with weights, a rack, a treadmill and a pilates reformer",
                  "Covered patio with a BBQ, a lounge suite and the spa pool",
                  "Outdoor dining with lake views, and a big lawn",
                ] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "howto",
      title: "How-to guides",
      emoji: "▶️",
      heading: "How to use the house",
      blocks: [
        {
          kind: "tabs",
          tabs: [
            {
              label: "Sauna",
              emoji: "🧖",
              image: PHOTO.garage,
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
              ],
            },
            {
              label: "Ice bath",
              emoji: "🧊",
              image: PHOTO.garage,
              blocks: [
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
                { kind: "callout", title: "Stay safe", text: "Never use the ice bath alone or after drinking, and keep children out unless an adult is right there with them." },
              ],
            },
            {
              label: "Spa pool",
              emoji: "💦",
              image: PHOTO.patio,
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
              label: "Heating",
              emoji: "🌡️",
              image: PHOTO.lounge,
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
              ],
            },
            {
              label: "Gym & bikes",
              emoji: "🏋️",
              image: PHOTO.garage,
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
                { kind: "callout", title: "Help yourself to the bikes", text: "The bikes in the garage are there for you to use. Please put them back when you're finished. Take extra care with the motorbike: set the speed to suit the rider before every ride, and always supervise children on it." },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "know",
      title: "Good to know",
      emoji: "💡",
      heading: "Good to know",
      image: PHOTO.kitchen,
      blocks: [
        { kind: "callout", title: "Tank water and a septic system", text: "The house isn't on town water or sewerage. It runs on rain-water tanks and a septic tank, so every drop counts." },
        { kind: "bullets", items: ["Keep showers short.", "Run the dishwasher and washing machine with full loads.", "Only toilet paper goes down the toilet.", "Sanitary items go in the bin, never the toilet."] },
        { kind: "cards", cards: [
          { title: "Bins", text: "Collection is Monday. Take the wheelie bin and the recycling bin down to the end of the driveway, on the cul-de-sac." },
          { title: "Laundry", text: "Washing machine and dryer are in the laundry. Full loads, please, to save water." },
          { title: "The garage", text: "Sauna, ice bath, gym and reformer. Children must be supervised in the garage." },
          { title: "Playground", text: "The playground and trampoline are in the back yard. Keep an eye on little ones." },
          { title: "Spa pool", text: "Keep the cover on whenever it isn't in use, and always supervise children around it." },
          { title: "Bikes", text: "The bikes in the garage are yours to use while you stay. Take extra care with the motorbike." },
        ] },
        { kind: "callout", title: "Our children's toys", text: "We've left our children's toys and books for you to enjoy. Please be gentle with them, and put everything back in the same spot when you're finished — it makes a real difference to our cleaners and our kids." },
        { kind: "text", text: "Accidents happen. If something gets broken or spilled, please tell us, even if you've cleaned it up. We'd much rather repair it than find it hidden." },
      ],
    },
    {
      id: "rules",
      title: "House rules",
      emoji: "📋",
      heading: "House rules",
      image: PHOTO.lounge,
      blocks: [
        { kind: "text", text: "A few friendly reminders, so our home stays lovely for you and for everyone after you." },
        {
          kind: "cards",
          cards: [
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
      id: "explore",
      title: "Explore Taupō",
      emoji: "📍",
      heading: "Local attractions",
      blocks: [
        { kind: "text", text: "Acacia Bay sits on the western side of the lake, a short drive from town. Tap a place to open its website on your phone." },
        {
          kind: "tabs",
          tabs: [
            {
              label: "Adults",
              emoji: "✨",
              blocks: [{ kind: "cards", cards: [
                place("Wairakei Terraces", "Thermal baths, for 14 years and over.", P.wairakei),
                place("Kinloch Golf Course", "Rated one of NZ's best courses.", P.kinloch),
                place("Craters Mountain Bike Park", "50 km of purpose-built trails.", P.craters),
                place("Confinement", "Escape rooms for groups.", P.confinement),
                place("BFT Taupō", "Casual gym passes.", P.bft),
                place("Doughboats", "Hire a boat for six and order a platter.", P.doughboats),
                place("Walk Mt Tauhara", "A steep 2.5 km climb to the 1,088 m summit.", P.tauhara),
                place("Living Waters Spa", "Massage at DeBretts thermal pools.", P.debretts),
                place("Rangatira Point Track", "A 20 minute walk, then jump off the rocks.", P.rangatira),
              ] }],
            },
            {
              label: "Teens",
              emoji: "🛹",
              blocks: [{ kind: "cards", cards: [
                place("Whakapapa, Mt Ruapehu", "Ski and snowboard.", P.ruapehu),
                place("The Landing", "Trampoline park, ninja course, bowling.", P.landing),
                place("The Cave", "Virtual reality and simulator racing.", P.cave),
                place("Swingers", "Mini golf.", P.swingers),
                place("AC Baths", "Public swimming pools.", P.acBaths),
                place("Pedal Boats", "Pedal boat hire at Wharewaka.", P.pedal),
                place("Taupō Watersports", "Banana boat rides.", P.watersports),
                place("The Edge Rockwall", "Indoor climbing at AC Baths.", P.rockwall),
                place("Bike Park", "BMX track at Spa Park.", P.spaPark),
              ] }],
            },
            {
              label: "Little ones",
              emoji: "🧸",
              blocks: [{ kind: "cards", cards: [
                place("Tongariro Playground", "Right in the town centre.", P.tongariro),
                place("Toddler Time Gymnastics", "Casual classes, Saturdays 9:15am.", P.gymnastics),
                place("The Landing", "Indoor playground, trampolines, arcade.", P.landing),
                place("Mind Junction", "Maze, discovery centre and Lego.", P.mindJunction),
                place("Lilliput Farm", "Animal park.", P.lilliput),
                place("Fairy Garden", "Whangamata Stream Walk, Kinloch.", P.fairy),
                place("Rock hunting", "Collect rocks in the Botanical Gardens."),
                place("Huka Prawn Park", "Fish for prawns, plus water play.", P.prawn),
                place("Lions Walk", "Wide lakefront paths for bikes and scooters.", P.lions),
              ] }],
            },
          ],
        },
      ],
    },
    {
      id: "dining",
      title: "Dining & drinks",
      emoji: "☕",
      heading: "Our recommendations",
      blocks: [
        { kind: "text", text: "Book ahead for the weekend, especially in summer. Tap a place to open its menu on your phone." },
        {
          kind: "tabs",
          tabs: [
            {
              label: "Restaurants",
              emoji: "🍽️",
              blocks: [{ kind: "cards", cards: [
                place("The Bistro", "There's a reason the reviews are so good: everything on the menu is delicious.", P.bistro),
                place("The Brantry", "Fine dining. Great atmosphere and private dining.", P.brantry),
                place("Embra", "A celebration of modern Kiwi food, cooked with French and British technique. Three or five courses.", P.embra),
                place("Bistro Lago at The Hilton", "From lake, land and ocean to your plate. À la carte lunch and dinner, and high tea.", P.lago),
                place("The Plateau", "Since 2004. Locally owned and operated, and it has truly stood the test of time.", P.plateau),
                place("Lionels", "Great atmosphere, impressive food and outstanding quality.", P.lionels),
                place("Roquette", "Big flavours and beautiful presentation.", P.roquette),
                place("Incredible India", "Our pick of Taupō's Indian restaurants. Takeaway and delivery too.", P.india),
                place("Sorrento", "Italian dining and a wine bar, with a takeaway menu.", P.sorrento),
              ] }],
            },
            {
              label: "Cafés",
              emoji: "☕",
              blocks: [{ kind: "cards", cards: [
                place("Cafe Baku", "Roberts Street. On the lakefront, open daily from 7am.", P.baku),
                place("Replete", "Heuheu Street. Opened in 1993 and still run by its original owners.", P.replete),
                place("The Cozy Corner", "Tamamutu Street. Perfect for vegetarians and vegans, with plenty of healthy choices.", P.cozy),
                place("L'Arté Café & Gallery", "Acacia Bay. Wander the garden paths of art and creativity. Closed Mondays and Tuesdays.", P.larte),
                place("The Storehouse", "Runanga Street. Takes private bookings and does catering.", P.storehouse),
                place("Industrie", "Napier Highway. Taupō's French-inspired kitchen and patisserie, next to Mitre 10.", P.industrie),
                place("Baked With Love", "Gascoigne Street. There's a cakery on site for special occasions.", P.baked),
                place("Kefi & Kefi", "Horomatangi Street. Dairy-free, gluten-free and vegan options.", P.kefi),
                place("Victoria's Cafe", "Tongariro Street. Great coffee, fresh food and a funky, eclectic interior.", P.victorias),
              ] }],
            },
            {
              label: "Bars",
              emoji: "🍻",
              blocks: [
                { kind: "cards", cards: [
                  place("2Mile Sailing Club", "Taupō's only bar right on the lake. Pizzas, a great atmosphere, licensed until 10pm.", P.twoMile),
                  place("Finns", "Covered beer garden. Kid friendly, with kids' meals and colouring packs.", P.finns),
                  place("Vine Eatery & Bar", "A tapas menu and a cocktail bar, with private rooms for larger groups.", P.vine),
                  place("The Deck", "Lake views. Pool tables and Sky Sport. Burgers and pizzas.", P.deck),
                  place("Lonestar", "Upstairs seats up to 55 with its own bar. Outside deck, fireplace and Sky Sport.", P.lonestar),
                  place("Jolly Good Fellows", "Lakefront pub. British pub-style meals with big portions.", P.jolly),
                  place("Mavericks", "A gastropub a little further from town, with strong drinks and entertainment.", P.mavericks),
                  place("Pub N Grub", "Town centre. Outdoor seating and classic pub food.", P.pubNGrub),
                  place("Jimmy Coops", "Home of Taupō's own Lakeman Craft Beer, on the lakefront.", P.jimmy),
                ] },
                { kind: "callout", text: "Please don't drink and drive." },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "emergency",
      title: "Emergency",
      emoji: "🚑",
      heading: "In an emergency",
      blocks: [
        { kind: "call", number: "111", label: "Police, fire or ambulance", note: "The address to give them: 5 Lens Way, Acacia Bay, Taupō." },
        { kind: "text", text: "The fire extinguisher and first aid kit are both kept under the kitchen sink." },
        { kind: "cards", cards: [
          { title: "Medical centre", text: "117 Te Heuheu Street · 07 378 4080" },
          { title: "Taupō Hospital", text: "38 Kōtare Street, Hilltop · 07 376 1000" },
          { title: "Pharmacy", text: "57 Tongariro Street · 07 378 5205" },
          { title: "Police, fire & ambulance", text: "21 Story Place · Dial 111" },
        ] },
        { kind: "cards", cards: [
          { title: "If the smoke alarm sounds", text: "Get everyone out of the house, close the doors behind you if it's safe to, and call 111 from outside." },
          { title: "If there's an earthquake", text: "Drop, cover and hold: get down, take cover under something sturdy like the dining table, and hold on until the shaking stops." },
        ] },
        { kind: "text", text: "Anything else, call your hosts, Matt & Ash, on 027 697 7961." },
      ],
    },
    {
      id: "checkout",
      title: "Check-out",
      emoji: "👋",
      heading: "Departure guide",
      image: PHOTO.exterior,
      blocks: [
        { kind: "text", text: "Check-out is at 10am, so our cleaners have the time they need to get the house ready again. Tick things off as you go." },
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
        { kind: "callout", title: "Bin night", text: "Rubbish collection is on Monday. If you're here on a Sunday night, please take the wheelie bin and the recycling bin down to the cul-de-sac." },
      ],
    },
    {
      id: "thanks",
      title: "Thank you",
      emoji: "✨",
      heading: "Thank you",
      image: PHOTO.outdoorDining,
      blocks: [
        { kind: "quote", text: "Thank you for staying in our home. We hope you leave rested, well fed and with a few new favourite places in Taupō.", signature: "Matt & Ash" },
        { kind: "text", text: "Lens Way is only available when we're travelling, so dates open up now and then. Ask us and we'll tell you honestly whether yours work." },
        { kind: "facts", facts: [{ label: "Email", value: "bookings@carlsonproperties.co.nz" }, { label: "Call or text", value: "027 697 7961" }] },
        {
          kind: "cards",
          title: "Our other houses",
          cards: [
            { title: "One Eleven on the Mile", text: "Lake views, a heated pool, a sauna and a spa, in Nukuhau.", href: SITE },
            { title: "13 Sedge Grove", text: "A covered patio, a games garage and room for the boat, in Nukuhau.", href: `${SITE}/other-properties` },
          ],
        },
      ],
    },
  ],
};

export const GUIDES: Record<string, Guide> = { [FIVE_LENS_WAY.id]: FIVE_LENS_WAY };

/** The guide a guest screen should show. One property for now. */
export const DEFAULT_GUIDE = FIVE_LENS_WAY;
