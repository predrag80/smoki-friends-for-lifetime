import type { AppLocale, AuthErrorCode, MarketCode } from "@sffl/shared";

/**
 * UI copy per locale. Final translations are client-provided; every locale
 * uses the Serbian copy until translations are delivered.
 */
const sr = {
  appName: "Smoki Friend for a Lifetime",
  tagline: "Isti ti. Različita životna doba. Smoki je uvek tu.",
  nav: {
    home: "Početna",
    login: "Prijavi se",
    account: "Moj nalog"
  },
  home: {
    headline: ["Isti ti.", "Različita životna doba.", "Smoki je uvek tu."],
    intro:
      "Postavi jednu fotografiju i vidi sebe juče, danas i jednog dana, u trenucima uz Smoki. Dobijaš fotografiju, kratak film, a na kraju i svoj Friend for a Lifetime film.",
    cta: "Napravi svoju priču",
    ctaSignedIn: "Nastavi svoju priču",
    haveAccount: "Već imaš nalog?",
    stripLabel: "Primer tri trenutka jedne Smoki priče",
    ageUnit: "godina",
    frames: [
      { period: "Juče", age: 12, scene: "Ekipa ispred škole" },
      { period: "Danas", age: 36, scene: "Utakmica u dnevnoj sobi" },
      { period: "Jednog dana", age: 70, scene: "Vikend na terasi" }
    ],
    howTitle: "Kako funkcioniše",
    steps: [
      { title: "Postavi fotografiju", text: "Jedna jasna fotografija lica je dovoljna." },
      { title: "Izaberi trenutak", text: "Životno doba, Smoki teritoriju i scenu koja ti je bliska." },
      {
        title: "Dobij fotografiju i film",
        text: "Prvo stiže tvoja fotografija, a zatim kratak film koji odmah možeš da podeliš."
      }
    ],
    finale: "Kada napraviš sva tri trenutka, spajamo ih u tvoj Friend for a Lifetime film.",
    campaign: "Kampanja traje od 1. januara do 31. marta 2027.",
    minAge: "Aplikacija je namenjena korisnicima od 12 godina."
  },
  form: {
    email: "Email",
    password: "Lozinka",
    passwordConfirm: "Ponovi lozinku",
    passwordHint: "Najmanje 8 karaktera, bar jedno slovo i jedan broj.",
    birth: "Mesec i godina rođenja",
    month: "Mesec",
    year: "Godina",
    market: "Država",
    choose: "Izaberi",
    guardianEmail: "Email roditelja ili staratelja",
    guardianHint:
      "Pošto imaš manje od {age} godina, roditelju ili staratelju šaljemo link da potvrdi saglasnost.",
    acceptTerms: "Prihvatam uslove korišćenja",
    acceptPrivacy: "Pročitao/la sam politiku privatnosti",
    marketing: "Želim da dobijam vesti i ponude Smokija (opciono)",
    legalPending: "Pravni tekstovi biće objavljeni pre početka kampanje.",
    or: "ili",
    google: "Nastavi sa Google nalogom"
  },
  register: {
    title: "Napravi nalog",
    subtitle: "Treba nam samo nekoliko podataka da bismo ti prikazali scene za tvoje godine.",
    submit: "Napravi nalog",
    submitting: "Pravimo nalog…",
    haveAccount: "Već imaš nalog?",
    login: "Prijavi se"
  },
  complete: {
    title: "Završi registraciju",
    subtitle: "Prijavljuješ se kao {email}. Treba nam još samo nekoliko podataka.",
    submit: "Završi registraciju",
    submitting: "Čuvamo…",
    loading: "Učitavamo…",
    retry: "Prijavi se ponovo"
  },
  login: {
    title: "Prijavi se",
    submit: "Prijavi se",
    submitting: "Prijavljujemo…",
    forgot: "Zaboravio/la si lozinku?",
    noAccount: "Nemaš nalog?",
    register: "Napravi nalog",
    googleError: "Prijava preko Google naloga nije uspela. Pokušaj ponovo."
  },
  forgot: {
    title: "Zaboravljena lozinka",
    subtitle: "Unesi email adresu naloga i poslaćemo ti link za novu lozinku.",
    submit: "Pošalji link",
    submitting: "Šaljemo…",
    sent: "Ako nalog sa ovom adresom postoji, poslali smo link za novu lozinku. Link važi 60 minuta.",
    back: "Nazad na prijavu"
  },
  reset: {
    title: "Nova lozinka",
    password: "Nova lozinka",
    submit: "Sačuvaj lozinku",
    submitting: "Čuvamo…",
    success: "Lozinka je promenjena i prijavljen/a si. Sa ostalih uređaja smo te odjavili.",
    continue: "Idi na moj nalog",
    requestNew: "Zatraži novi link"
  },
  verify: {
    title: "Potvrda email adrese",
    working: "Potvrđujemo tvoju email adresu…",
    success: "Email adresa je potvrđena.",
    continue: "Idi na moj nalog"
  },
  guardian: {
    title: "Saglasnost roditelja ili staratelja",
    intro: "Nalog {child} čeka vašu saglasnost.",
    explain: [
      "Korisnik postavlja jednu fotografiju lica, od koje pravimo AI fotografije i kratke filmove u scenama sa Smokijem.",
      "Fotografije i filmovi su privatni. Vidi ih samo korisnik, osim kada sam odluči da ih podeli.",
      "Nalog, fotografije i filmovi mogu da se obrišu u bilo kom trenutku."
    ],
    accept:
      "Ja sam roditelj ili staratelj ovog korisnika i saglasan/na sam sa obradom njegovih podataka i fotografije.",
    submit: "Dajem saglasnost",
    submitting: "Čuvamo…",
    confirmed: "Hvala. Saglasnost je zabeležena i korisnik može da nastavi.",
    loading: "Učitavamo…"
  },
  account: {
    title: "Moj nalog",
    loading: "Učitavamo nalog…",
    stepsTitle: "Pre prvog trenutka",
    ready: "Sve je spremno. Napravi svoje trenutke.",
    done: "Gotovo",
    waiting: "Čeka",
    emailStep: "Potvrdi email adresu",
    emailPending: "Poslali smo link na {email}.",
    emailDone: "Email adresa je potvrđena.",
    guardianStep: "Saglasnost roditelja",
    guardianPending: "Čekamo potvrdu sa adrese {email}.",
    guardianDone: "Roditelj ili staratelj je dao saglasnost.",
    photoStep: "Saglasnost za obradu fotografije",
    photoText:
      "Tvoju fotografiju koristimo samo da bismo napravili tvoje AI fotografije i filmove. Fotografija je privatna i možeš da je obrišeš kad god želiš.",
    photoDone: "Saglasnost je data.",
    grant: "Dajem saglasnost",
    revoke: "Povuci saglasnost",
    resend: "Pošalji ponovo",
    sent: "Poslato. Proveri inbox.",
    profileTitle: "Podaci",
    profileEmail: "Email",
    profileBirth: "Rođen/a",
    profileMarket: "Država",
    profileSignIn: "Prijava",
    signInPassword: "Email i lozinka",
    signInGoogle: "Google nalog",
    logout: "Odjavi se",
    storyCta: "Moja Smoki priča",
    deleteTitle: "Brisanje naloga",
    deleteText: "Brišemo nalog, tvoje fotografije i filmove. Ovo ne može da se poništi.",
    deleteButton: "Obriši nalog",
    deleteConfirm: "Da, obriši moj nalog",
    cancel: "Odustani"
  },
  story: {
    title: "Moja Smoki priča",
    subtitle: "Tri trenutka, tri životna doba. Napravi svaki od njih uz Smoki.",
    account: "Moj nalog",
    notReady: "Pre prvog trenutka završi korake na svom nalogu: potvrda email adrese i saglasnosti.",
    notReadyCta: "Idi na moj nalog",
    loading: "Učitavamo tvoju priču…",
    photoTitle: "Tvoja fotografija",
    photoIntro: "Od ove fotografije pravimo sve tvoje trenutke. Vidiš je samo ti.",
    photoTips: [
      "Samo ti na fotografiji, lice okrenuto ka kameri",
      "Dobro osvetljenje, bez naočara za sunce, maske i filtera",
      "JPG, PNG ili WebP, najviše 10 MB"
    ],
    choosePhoto: "Izaberi fotografiju",
    changePhoto: "Promeni fotografiju",
    uploading: "Proveravamo fotografiju…",
    photoAlt: "Tvoja fotografija",
    stripLabel: "Tvoja tri trenutka",
    periods: { YESTERDAY: "Juče", TODAY: "Danas", SOMEDAY: "Jednog dana" },
    ageUnit: "godina",
    create: "Napravi trenutak",
    needPhoto: "Prvo postavi fotografiju",
    unavailable: "Nije dostupno za tvoje godine",
    pending: "Pravimo tvoju fotografiju…",
    pendingHint: "Možeš da zatvoriš stranicu, sačuvaćemo je.",
    retry: "Pokušaj ponovo",
    regenerate: "Napravi ponovo",
    left: "još {count} danas",
    limitReached: "Za danas si iskoristio/la sve pokušaje za ovaj trenutak.",
    momentAlt: "{period}: {scene}, {age} godina",
    builderTitle: "{period}: napravi trenutak",
    builderRegenerateTitle: "{period}: napravi ponovo",
    ageLabel: "Koliko godina imaš na fotografiji?",
    ageFixed: "Danas imaš {age} godina.",
    territoryLabel: "Gde je trenutak?",
    territories: {
      RELAXING: "Trenutak za sebe",
      SOCIALIZING: "Sa mojim ljudima",
      SPORT_CHEERING: "Zajedno navijamo"
    },
    sceneLabel: "Izaberi scenu",
    scenesLoading: "Učitavamo scene…",
    noScenes: "Za ove godine nema scena u ovoj teritoriji. Izaberi drugu teritoriju ili godine.",
    confirm: "Napravi fotografiju",
    submitting: "Šaljemo…",
    close: "Zatvori"
  },
  months: [
    "Januar",
    "Februar",
    "Mart",
    "April",
    "Maj",
    "Jun",
    "Jul",
    "Avgust",
    "Septembar",
    "Oktobar",
    "Novembar",
    "Decembar"
  ],
  markets: {
    SRB: "Srbija",
    BIH: "Bosna i Hercegovina",
    HRV: "Hrvatska",
    MKD: "Severna Makedonija",
    AUT: "Austrija"
  } satisfies Record<MarketCode, string>,
  errors: {
    INVALID_BODY: "Proveri unete podatke.",
    INVALID_BIRTH_DATE: "Datum rođenja nije ispravan.",
    WEAK_PASSWORD: "Lozinka mora da ima najmanje 8 karaktera, bar jedno slovo i jedan broj, i ne sme da bude ista kao email.",
    UNDER_MIN_AGE: "Aplikacija je dostupna od 12 godina.",
    GUARDIAN_EMAIL_REQUIRED: "Unesi email roditelja ili staratelja.",
    GUARDIAN_EMAIL_SAME_AS_USER: "Email roditelja mora da bude drugačiji od tvog.",
    EMAIL_TAKEN: "Nalog sa ovom email adresom već postoji. Prijavi se.",
    INVALID_CREDENTIALS: "Email ili lozinka nisu ispravni.",
    UNAUTHENTICATED: "Prijavi se da nastaviš.",
    INVALID_TOKEN: "Link nije ispravan ili je već iskorišćen.",
    TOKEN_EXPIRED: "Link je istekao. Zatraži novi iz svog naloga.",
    ALREADY_VERIFIED: "Email adresa je već potvrđena.",
    GUARDIAN_NOT_REQUIRED: "Saglasnost roditelja više nije potrebna.",
    GUARDIAN_ALREADY_CONFIRMED: "Roditelj je već dao saglasnost.",
    MARKETING_NOT_ALLOWED: "Vesti i ponude dostupne su od 18 godina.",
    GOOGLE_NOT_CONFIGURED: "Prijava preko Google naloga trenutno nije dostupna.",
    RATE_LIMITED: "Previše pokušaja. Sačekaj minut i pokušaj ponovo.",
    NETWORK: "Server trenutno nije dostupan. Pokušaj ponovo.",
    UNKNOWN: "Nešto nije u redu. Pokušaj ponovo.",
    NOT_READY: "Pre prvog trenutka završi korake na svom nalogu.",
    NO_SOURCE_PHOTO: "Prvo postavi svoju fotografiju.",
    SCENE_NOT_AVAILABLE: "Ova scena nije dostupna za izabrane godine.",
    AGE_OUT_OF_PERIOD_RANGE: "Izabrane godine ne odgovaraju ovom životnom dobu.",
    PERIOD_NOT_AVAILABLE: "Ovo životno doba nije dostupno za tvoje godine.",
    MOMENT_EXISTS: "Ovaj trenutak već postoji. Možeš da ga napraviš ponovo.",
    GENERATION_IN_PROGRESS: "Fotografija se već pravi. Sačekaj da bude gotova.",
    DAILY_LIMIT_REACHED: "Za danas si iskoristio/la sve pokušaje za ovaj trenutak.",
    FACE_CHECK_UNAVAILABLE: "Provera fotografije trenutno nije dostupna. Pokušaj za minut.",
    GENERATION_FAILED: "Fotografija ovaj put nije uspela. Probaj ponovo.",
    GENERATION_BLOCKED: "Ovu kombinaciju nismo mogli da napravimo. Probaj drugu scenu ili uzrast.",
    PHOTO_MISSING: "Izaberi fotografiju.",
    PHOTO_TOO_LARGE: "Fotografija je veća od 10 MB.",
    PHOTO_UNSUPPORTED_FORMAT: "Podržani su JPG, PNG i WebP formati.",
    PHOTO_TOO_SMALL: "Fotografija je premala. Potrebno je bar 512 piksela po kraćoj strani.",
    PHOTO_UNREADABLE: "Ovu fotografiju ne možemo da otvorimo. Probaj drugu.",
    NO_FACE: "Na fotografiji nismo pronašli lice.",
    MULTIPLE_FACES: "Na fotografiji je više osoba. Potrebna je fotografija na kojoj si samo ti.",
    FACE_NOT_CLEAR: "Lice nije dovoljno jasno. Probaj oštriju fotografiju sa boljim svetlom.",
    FACE_OBSTRUCTED: "Lice je delimično pokriveno. Skini naočare za sunce, masku ili filter.",
    NOT_A_PHOTO: "Potrebna je prava fotografija, ne crtež ni snimak ekrana.",
    NOT_FOUND: "Nije pronađeno.",
    invalidEmail: "Unesi ispravnu email adresu.",
    passwordShort: "Lozinka mora da ima najmanje 8 karaktera.",
    passwordTooLong: "Lozinka može da ima najviše 200 karaktera.",
    passwordLetterNumber: "Lozinka mora da sadrži bar jedno slovo i jedan broj.",
    passwordSameAsEmail: "Lozinka ne sme da bude ista kao email adresa.",
    passwordMismatch: "Lozinke se ne poklapaju.",
    emailRequired: "Unesi email adresu.",
    passwordRequired: "Unesi lozinku.",
    birthRequired: "Izaberi mesec i godinu rođenja.",
    marketRequired: "Izaberi državu.",
    guardianEmailInvalid: "Unesi ispravan email roditelja ili staratelja.",
    formHasErrors: "Ispravi označena polja.",
    acceptRequired: "Potrebno je da prihvatiš uslove i politiku privatnosti.",
    required: "Popuni sva obavezna polja."
  } satisfies Record<AuthErrorCode | "RATE_LIMITED" | "NETWORK" | "UNKNOWN", string> & Record<string, string>
};

export type Messages = typeof sr;

const messagesByLocale: Record<AppLocale, Messages> = {
  sr,
  bs: { ...sr },
  hr: { ...sr },
  mk: { ...sr },
  de: { ...sr }
};

export function getMessages(locale: AppLocale): Messages {
  return messagesByLocale[locale];
}

/** Replaces {name} placeholders. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}

export function errorMessage(messages: Messages, code: string): string {
  return (messages.errors as Record<string, string>)[code] ?? messages.errors.UNKNOWN;
}
