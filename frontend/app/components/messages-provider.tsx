"use client";

import { createContext, useContext } from "react";

import type { AppLocale } from "@sffl/shared";

import type { Messages } from "../lib/messages";

type MessagesContextValue = { locale: AppLocale; messages: Messages };

const MessagesContext = createContext<MessagesContextValue | null>(null);

export function MessagesProvider({
  locale,
  messages,
  children
}: MessagesContextValue & { children: React.ReactNode }) {
  return <MessagesContext.Provider value={{ locale, messages }}>{children}</MessagesContext.Provider>;
}

export function useMessages(): MessagesContextValue {
  const value = useContext(MessagesContext);
  if (!value) throw new Error("useMessages must be used inside MessagesProvider");
  return value;
}
