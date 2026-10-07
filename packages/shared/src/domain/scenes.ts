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
};

export const sceneCatalog: readonly SceneDefinition[] = [
  // RELAXING — Trenutak za sebe
  { id: "movie-night-couch", territory: "RELAXING", sortOrder: 1, minAge: 6, maxAge: 90,
    title: "Filmsko veče na kauču",
    description: "Topla dnevna soba, omiljeni film i činija Smokija nadohvat ruke." },
  { id: "music-afternoon", territory: "RELAXING", sortOrder: 2, minAge: 10, maxAge: 90,
    title: "Popodne uz muziku",
    description: "Soba ili dnevna soba, omiljene pesme i poznata opuštena atmosfera." },
  { id: "break-from-duties", territory: "RELAXING", sortOrder: 3, minAge: 10, maxAge: 70,
    title: "Pauza od obaveza",
    description: "Učenje, fakultet ili posao; knjiga ili laptop je spušten, Smoki je na stolu." },
  { id: "weekend-terrace", territory: "RELAXING", sortOrder: 4, minAge: 6, maxAge: 90,
    title: "Vikend na terasi",
    description: "Sunčano popodne, fotelja ili stolice u dvorištu i otvorena kesa Smokija." },
  { id: "home-gaming", territory: "RELAXING", sortOrder: 5, minAge: 8, maxAge: 70,
    title: "Gejming kod kuće",
    description: "Predah između dve partije, kontroleri sa strane, Smoki u blizini." },

  // SOCIALIZING — Sa mojim ljudima
  { id: "crew-in-front-of-school", territory: "SOCIALIZING", sortOrder: 1, minAge: 10, maxAge: 19,
    title: "Ekipa ispred škole",
    description: "Društvo na klupi ili stepenicama tokom odmora; Smoki kruži kroz ekipu." },
  { id: "neighborhood-bench", territory: "SOCIALIZING", sortOrder: 2, minAge: 12, maxAge: 90,
    title: "Klupa u kraju",
    description: "Dvoje ili troje bliskih prijatelja, opušten razgovor i zajednička kesa." },
  { id: "card-games-at-home", territory: "SOCIALIZING", sortOrder: 3, minAge: 10, maxAge: 90,
    title: "Kartanje kod kuće",
    description: "Karte ili društvena igra na stolu, spontan smeh i činija Smokija u sredini." },
  { id: "house-birthday", territory: "SOCIALIZING", sortOrder: 4, minAge: 6, maxAge: 90,
    title: "Kućni rođendan",
    description: "Neformalno slavlje, prijatelji oko stola i poznato Smoki posluženje." },
  { id: "evening-for-two", territory: "SOCIALIZING", sortOrder: 5, minAge: 18, maxAge: 90,
    title: "Veče udvoje",
    description: "Partner ili dugogodišnji prijatelj, film i zajednička činija Smokija." },

  // SPORT_CHEERING — Zajedno navijamo
  { id: "match-in-living-room", territory: "SPORT_CHEERING", sortOrder: 1, minAge: 6, maxAge: 90,
    title: "Utakmica u dnevnoj sobi",
    description: "Društvo ispred televizora, važan trenutak i velika činija Smokija." },
  { id: "match-in-cafe", territory: "SPORT_CHEERING", sortOrder: 2, minAge: 18, maxAge: 90,
    title: "Utakmica u kafiću",
    description: "Ekipa za stolom, pogled u ekran, zajedničko iščekivanje." },
  { id: "local-stands", territory: "SPORT_CHEERING", sortOrder: 3, minAge: 8, maxAge: 80,
    title: "Tribine lokalnog terena",
    description: "Poznati teren u kraju, podrška prijateljima i Smoki posle meča." },
  { id: "neighborhood-court", territory: "SPORT_CHEERING", sortOrder: 4, minAge: 8, maxAge: 60,
    title: "Basket ili fudbal u kraju",
    description: "Ekipa posle igre na klupi; pauza, priča i otvorena kesa Smokija." },
  { id: "post-match-celebration", territory: "SPORT_CHEERING", sortOrder: 5, minAge: 10, maxAge: 90,
    title: "Slavlje posle utakmice",
    description: "Spontana radost u poznatom društvu nakon važne pobede." }
];

export type SceneAgeRule = Pick<SceneDefinition, "minAge" | "maxAge">;

export function isSceneAvailableAtAge(scene: SceneAgeRule, age: number): boolean {
  return age >= scene.minAge && age <= scene.maxAge;
}

export function filterScenesByAge<T extends SceneAgeRule>(scenes: readonly T[], age: number): T[] {
  return scenes.filter((scene) => isSceneAvailableAtAge(scene, age));
}
