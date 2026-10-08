"use client";

import type { AuthConfigResponse } from "@sffl/shared";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import { useMessages } from "./messages-provider";
import ui from "./ui.module.css";

/** Shown only when Google sign-in is configured on the API. */
export function GoogleButton() {
  const { messages } = useMessages();
  const { data } = useQuery({
    queryKey: ["auth-config"],
    queryFn: () => apiFetch<AuthConfigResponse>("/auth/config"),
    staleTime: 5 * 60 * 1000
  });

  if (!data?.google.enabled || !data.google.startUrl) return null;

  return (
    <>
      <div className={ui.divider}>{messages.form.or}</div>
      <a className={ui.secondary} href={data.google.startUrl}>
        {messages.form.google}
      </a>
    </>
  );
}
