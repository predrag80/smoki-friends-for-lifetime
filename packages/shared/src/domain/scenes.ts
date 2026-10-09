/**
 * Scene catalog v1: 15 scenes across three Smoki territories (source: product proposal, 25.09.2026).
 * Age ranges agreed with the client on 2026-10-07. Serbian copy is the default until
 * translations are delivered; other locales fall back to it.
 */
export const territories = ["RELAXING", "SOCIALIZING", "SPORT_CHEERING"] as const;
export type Territory = (typeof territories)[number];

export type SceneDefinition = {
  id: string;
  territory: Territory;
  sortOrder: number;
  minAge: number;
  maxAge: number;
  title: string;
  description: string;
  /** Internal English scene description for the image model (never shown to users). Brand-free. */
  prompt: string;
  /** Where the snack package sits in the scene; used only when a real packshot reference is configured. */
  productPlacement: string;
};

export const sceneCatalog: readonly SceneDefinition[] = [
  // RELAXING — Trenutak za sebe
  { id: "movie-night-couch", territory: "RELAXING", sortOrder: 1, minAge: 6, maxAge: 90,
    title: "Filmsko veče na kauču",
    description: "Topla dnevna soba, omiljeni film i činija Smokija nadohvat ruke.",
    prompt: "a cosy living room in the evening, the person relaxing on a sofa under a soft blanket, the glow of a TV with a film playing",
    productPlacement: "on the sofa within reach, next to a bowl of peanut snacks" },
  { id: "music-afternoon", territory: "RELAXING", sortOrder: 2, minAge: 10, maxAge: 90,
    title: "Popodne uz muziku",
    description: "Soba ili dnevna soba, omiljene pesme i poznata opuštena atmosfera.",
    prompt: "a bright bedroom or living room in the afternoon, the person relaxing and listening to music with headphones or a speaker",
    productPlacement: "open next to the person" },
  { id: "break-from-duties", territory: "RELAXING", sortOrder: 3, minAge: 10, maxAge: 70,
    title: "Pauza od obaveza",
    description: "Učenje, fakultet ili posao; knjiga ili laptop je spušten, Smoki je na stolu.",
    prompt: "a desk with books or a laptop pushed aside, the person taking a relaxed break from studying or work",
    productPlacement: "on the desk" },
  { id: "weekend-terrace", territory: "RELAXING", sortOrder: 4, minAge: 6, maxAge: 90,
    title: "Vikend na terasi",
    description: "Sunčano popodne, fotelja ili stolice u dvorištu i otvorena kesa Smokija.",
    prompt: "a sunny weekend afternoon on a terrace or in a small garden, the person sitting in a comfortable chair",
    productPlacement: "open on the small table" },
  { id: "home-gaming", territory: "RELAXING", sortOrder: 5, minAge: 8, maxAge: 70,
    title: "Gejming kod kuće",
    description: "Predah između dve partije, kontroleri sa strane, Smoki u blizini.",
    prompt: "a living room with a TV and game controllers, the person taking a short break between two games, smiling",
    productPlacement: "on the coffee table nearby" },

  // SOCIALIZING — Sa mojim ljudima
  { id: "crew-in-front-of-school", territory: "SOCIALIZING", sortOrder: 1, minAge: 10, maxAge: 19,
    title: "Ekipa ispred škole",
    description: "Društvo na klupi ili stepenicama tokom odmora; Smoki kruži kroz ekipu.",
    prompt: "outside a school during a break, the person sitting on a bench or steps with a few friends of the same age",
    productPlacement: "being shared among the friends" },
  { id: "neighborhood-bench", territory: "SOCIALIZING", sortOrder: 2, minAge: 12, maxAge: 90,
    title: "Klupa u kraju",
    description: "Dvoje ili troje bliskih prijatelja, opušten razgovor i zajednička kesa.",
    prompt: "a bench in a familiar neighbourhood park, the person with two close friends of a similar age having a relaxed conversation",
    productPlacement: "being shared on the bench" },
  { id: "card-games-at-home", territory: "SOCIALIZING", sortOrder: 3, minAge: 10, maxAge: 90,
    title: "Kartanje kod kuće",
    description: "Karte ili društvena igra na stolu, spontan smeh i činija Smokija u sredini.",
    prompt: "a kitchen or living room table with cards or a board game, the person laughing with friends or family",
    productPlacement: "in the middle of the table next to a bowl of peanut snacks" },
  { id: "house-birthday", territory: "SOCIALIZING", sortOrder: 4, minAge: 6, maxAge: 90,
    title: "Kućni rođendan",
    description: "Neformalno slavlje, prijatelji oko stola i poznato Smoki posluženje.",
    prompt: "an informal birthday celebration at home, friends around a table with a small cake, the person in the centre",
    productPlacement: "on the table next to a bowl of peanut snacks" },
  { id: "evening-for-two", territory: "SOCIALIZING", sortOrder: 5, minAge: 18, maxAge: 90,
    title: "Veče udvoje",
    description: "Partner ili dugogodišnji prijatelj, film i zajednička činija Smokija.",
    prompt: "a calm evening at home on a sofa, the person with a partner or long-time friend watching a film",
    productPlacement: "on the coffee table next to a shared bowl of peanut snacks" },

  // SPORT_CHEERING — Zajedno navijamo
  { id: "match-in-living-room", territory: "SPORT_CHEERING", sortOrder: 1, minAge: 6, maxAge: 90,
    title: "Utakmica u dnevnoj sobi",
    description: "Društvo ispred televizora, važan trenutak i velika činija Smokija.",
    prompt: "a living room during an important televised football or basketball match, the person cheering with friends in front of the TV",
    productPlacement: "on the table next to a large bowl of peanut snacks" },
  { id: "match-in-cafe", territory: "SPORT_CHEERING", sortOrder: 2, minAge: 18, maxAge: 90,
    title: "Utakmica u kafiću",
    description: "Ekipa za stolom, pogled u ekran, zajedničko iščekivanje.",
    prompt: "a casual cafe with a big screen showing a match, the person at a table with friends, watching intently",
    productPlacement: "on the table" },
  { id: "local-stands", territory: "SPORT_CHEERING", sortOrder: 3, minAge: 8, maxAge: 80,
    title: "Tribine lokalnog terena",
    description: "Poznati teren u kraju, podrška prijateljima i Smoki posle meča.",
    prompt: "the small stands of a local neighbourhood sports field, the person cheering for friends playing",
    productPlacement: "in the person's hands while eating" },
  { id: "neighborhood-court", territory: "SPORT_CHEERING", sortOrder: 4, minAge: 8, maxAge: 60,
    title: "Basket ili fudbal u kraju",
    description: "Ekipa posle igre na klupi; pauza, priča i otvorena kesa Smokija.",
    prompt: "a neighbourhood basketball or football court after a game, the person sitting on a bench with teammates, resting and talking",
    productPlacement: "open on the bench" },
  { id: "post-match-celebration", territory: "SPORT_CHEERING", sortOrder: 5, minAge: 10, maxAge: 90,
    title: "Slavlje posle utakmice",
    description: "Spontana radost u poznatom društvu nakon važne pobede.",
    prompt: "a joyful spontaneous celebration with familiar friends right after an important win, the person in the middle of the group",
    productPlacement: "in the person's hand" }
];

export type SceneAgeRule = Pick<SceneDefinition, "minAge" | "maxAge">;

export function isSceneAvailableAtAge(scene: SceneAgeRule, age: number): boolean {
  return age >= scene.minAge && age <= scene.maxAge;
}

export function filterScenesByAge<T extends SceneAgeRule>(scenes: readonly T[], age: number): T[] {
  return scenes.filter((scene) => isSceneAvailableAtAge(scene, age));
}
