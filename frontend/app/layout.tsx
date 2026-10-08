import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { MessagesProvider } from "./components/messages-provider";
import "./globals.css";
import { localeToHtmlLang } from "./lib/locale";
import { getMessages } from "./lib/messages";
import { getRequestLocale } from "./lib/request-locale";
import { Providers } from "./providers";

const inter = localFont({
  src: "../public/fonts/Inter-Variable.ttf",
  variable: "--font-inter",
  display: "swap"
});

const oswald = localFont({
  src: "../public/fonts/Oswald-Variable.ttf",
  variable: "--font-oswald",
  display: "swap"
});

export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(await getRequestLocale());
  return { title: messages.appName, description: messages.tagline };
}

export const viewport: Viewport = { themeColor: "#d0232a" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();

  return (
    <html lang={localeToHtmlLang(locale)} className={`${inter.variable} ${oswald.variable}`}>
      <body>
        <Providers>
          <MessagesProvider locale={locale} messages={getMessages(locale)}>
            {children}
          </MessagesProvider>
        </Providers>
      </body>
    </html>
  );
}
