"use client";

import type { MeResponse } from "@sffl/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { useMessages } from "../components/messages-provider";
import { TextField } from "../components/text-field";
import ui from "../components/ui.module.css";
import { apiFetch, errorCode } from "../lib/api";
import { errorMessage, format } from "../lib/messages";
import { validateEmailField } from "../lib/validation";
import styles from "./account-view.module.css";

/** Teenagers above the consent age may name a parent, so they can be on shared photos together. */
export function ParentLinkForm({ link }: { link: MeResponse["parentLink"] }) {
  const { messages } = useMessages();
  const a = messages.account;
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);

  const onSuccess = (data: MeResponse) => {
    queryClient.setQueryData(["me"], data);
    void queryClient.invalidateQueries({ queryKey: ["story"] });
    setValue("");
    setEditing(false);
  };
  const send = useMutation({
    mutationFn: (parentEmail: string) => apiFetch<MeResponse>("/me/parent-link", { method: "POST", body: { parentEmail } }),
    onSuccess,
    onError: (failure) => setError(errorCode(failure))
  });
  const remove = useMutation({
    mutationFn: () => apiFetch<MeResponse>("/me/parent-link", { method: "DELETE" }),
    onSuccess,
    onError: (failure) => setError(errorCode(failure))
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = validateEmailField(value);
    setError(problem);
    if (!problem) send.mutate(value.trim());
  }

  const showForm = link.status === "NONE" || editing;

  return (
    <section>
      <h2 className={styles.sectionTitle}>{a.parentTitle}</h2>
      <p className={ui.hint}>{a.parentText}</p>
      {link.status !== "NONE" ? (
        <p className={ui.notice}>
          {format(link.status === "CONFIRMED" ? a.parentConfirmed : a.parentPending, { email: link.email ?? "" })}
        </p>
      ) : null}

      {showForm ? (
        <form className={ui.stack} onSubmit={onSubmit} noValidate>
          <TextField label={a.parentEmail} type="email" autoComplete="off" value={value} onChange={setValue} error={error} />
          <div>
            <button className={ui.ghost} type="submit" disabled={send.isPending}>
              {send.isPending ? a.saving : a.parentSend}
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.actions}>
          {error ? <p className={ui.error}>{errorMessage(messages, error)}</p> : null}
          <button className={ui.ghost} type="button" onClick={() => setEditing(true)}>
            {a.parentChange}
          </button>
          <button className={ui.ghost} type="button" disabled={remove.isPending} onClick={() => remove.mutate()}>
            {a.parentRemove}
          </button>
        </div>
      )}
    </section>
  );
}
