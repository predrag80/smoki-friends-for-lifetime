import type { Metadata } from "next";

import "./globals.css";
import { localeToHtmlLang } from "./lib/locale";
import { getMessages } from "./lib/messages";
import { getRequestLocale } from "./lib/request-locale";
import { Providers } from "./providers";

export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(await getRequestLocale());

  return {
    title: messages.appName,
    description: messages.tagline
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();

  return (
    <html lang={localeToHtmlLang(locale)}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
