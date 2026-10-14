"use client";

import type { InvitePreview, MeResponse } from "@sffl/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { useMessages } from "../components/messages-provider";
import ui from "../components/ui.module.css";
import { apiFetch, ApiError, errorCode } from "../lib/api";
import { errorMessage, format } from "../lib/messages";
import { formatShortDateTime, sharedWhen } from "../lib/shared";

/** Page opened from the invite email: preview, then accept or decline after signing in. */
export function InviteView({ token }: { token: string }) {
  const { messages } = useMessages();
  const t = messages.invite;
  const [error, setError] = useState<string | null>(null);

  const preview = useQuery({
    queryKey: ["invite", token],
    queryFn: () => apiFetch<InvitePreview>("/shared/invite/lookup", { method: "POST", body: { token } }),
    enabled: token.length > 0,
    retry: false
  });
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiFetch<MeResponse>("/auth/me"), retry: false });
  const signedOut = me.error instanceof ApiError && me.error.status === 401;

  const respond = useMutation({
    mutationFn: (action: "accept" | "decline") =>
      apiFetch(`/shared/invite/${action}`, { method: "POST", body: { token } }).then(() => action),
    onMutate: () => setError(null),
    onError: (failure) => setError(errorCode(failure))
  });

  if (!token || preview.isError) {
    return <p className={ui.error}>{errorMessage(messages, token ? errorCode(preview.error) : "INVITE_NOT_FOUND")}</p>;
  }
  if (!preview.data || me.isPending) return <p className={ui.hint}>{t.loading}</p>;

  const storyLink = (
    <Link className={ui.primary} href="/story">
      {t.toStory}
    </Link>
  );
  if (respond.data === "accept") {
    return (
      <div className={ui.stack}>
        <p className={ui.notice}>{t.accepted}</p>
        {storyLink}
      </div>
    );
  }
  if (respond.data === "decline") return <p className={ui.notice}>{t.declined}</p>;

  const { from, sceneTitle, status, expiresAt, period, yearsOffset } = preview.data;
  if (status === "EXPIRED") return <p className={ui.error}>{errorMessage(messages, "INVITE_EXPIRED")}</p>;
  if (status !== "PENDING") {
    return (
      <div className={ui.stack}>
        <p className={ui.notice}>{t.closed}</p>
        {signedOut ? null : storyLink}
      </div>
    );
  }

  const here = `/invite?token=${encodeURIComponent(token)}`;
  return (
    <div className={ui.stack}>
      <p>{format(t.text, { from, scene: sceneTitle, when: sharedWhen(messages, period, yearsOffset) })}</p>
      <p className={ui.hint}>{t.explain}</p>
      <p className={ui.hint}>{format(t.validUntil, { date: formatShortDateTime(expiresAt) })}</p>

      {signedOut ? (
        <>
          <p>{t.needAccount}</p>
          <Link className={ui.primary} href={`/login?redirect=${encodeURIComponent(here)}`}>
            {t.login}
          </Link>
          <Link className={ui.secondary} href="/register">
            {t.register}
          </Link>
        </>
      ) : (
        <>
          {error ? (
            <p className={ui.error} role="alert">
              {errorMessage(messages, error)}
            </p>
          ) : null}
          <button className={ui.primary} type="button" disabled={respond.isPending} onClick={() => respond.mutate("accept")}>
            {respond.isPending ? t.accepting : t.accept}
          </button>
          <button className={ui.ghost} type="button" disabled={respond.isPending} onClick={() => respond.mutate("decline")}>
            {t.decline}
          </button>
        </>
      )}
    </div>
  );
}
