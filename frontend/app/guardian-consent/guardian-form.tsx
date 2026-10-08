"use client";

import type { GuardianLookupResponse } from "@sffl/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { useMessages } from "../components/messages-provider";
import ui from "../components/ui.module.css";
import { apiFetch, errorCode } from "../lib/api";
import { errorMessage, format } from "../lib/messages";
import styles from "./guardian-form.module.css";

export function GuardianConsentForm({ token }: { token: string }) {
  const { messages } = useMessages();
  const g = messages.guardian;
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useQuery({
    queryKey: ["guardian-consent", token],
    queryFn: () => apiFetch<GuardianLookupResponse>("/guardian-consent/lookup", { method: "POST", body: { token } }),
    enabled: token.length > 0,
    retry: false
  });

  const confirm = useMutation({
    mutationFn: () =>
      apiFetch<{ status: "CONFIRMED" }>("/guardian-consent/confirm", { method: "POST", body: { token, accept: true } }),
    onError: (failure) => setError(errorCode(failure))
  });

  if (!token || lookup.isError) {
    return <p className={ui.error}>{errorMessage(messages, token ? errorCode(lookup.error) : "INVALID_TOKEN")}</p>;
  }
  if (!lookup.data) return <p className={ui.hint}>{g.loading}</p>;
  if (lookup.data.status === "CONFIRMED" || confirm.isSuccess) return <p className={ui.notice}>{g.confirmed}</p>;
  if (lookup.data.expired) return <p className={ui.error}>{errorMessage(messages, "TOKEN_EXPIRED")}</p>;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!accepted) return setError("required");
    confirm.mutate();
  }

  return (
    <form className={ui.form} onSubmit={onSubmit} noValidate>
      <p>{format(g.intro, { child: lookup.data.childEmail })}</p>
      <ul className={styles.points}>
        {g.explain.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <label className={ui.check}>
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        <span>{g.accept}</span>
      </label>
      {error ? (
        <p className={ui.error} role="alert">
          {errorMessage(messages, error)}
        </p>
      ) : null}
      <button className={ui.primary} type="submit" disabled={confirm.isPending}>
        {confirm.isPending ? g.submitting : g.submit}
      </button>
    </form>
  );
}
