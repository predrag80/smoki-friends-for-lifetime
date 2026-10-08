/** Markets covered by the campaign. Country is stored independently of UI language. */
export const marketCodes = ["SRB", "BIH", "HRV", "MKD", "AUT"] as const;
export type MarketCode = (typeof marketCodes)[number];

/** UI languages. */
export const appLocales = ["sr", "bs", "hr", "mk", "de"] as const;
export type AppLocale = (typeof appLocales)[number];
export const defaultLocale: AppLocale = "sr";
