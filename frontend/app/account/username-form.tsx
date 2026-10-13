"use client";

import type { MeResponse } from "@sffl/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { useMessages } from "../components/messages-provider";
import { TextField } from "../components/text-field";
import ui from "../components/ui.module.css";
import { apiFetch, errorCode } from "../lib/api";
import { validateUsername } from "../lib/profile";
import styles from "./account-view.module.css";

/** Choose or change the public username friends use to invite you to a shared photo. */
export function UsernameForm({ current }: { current: string | null }) {
  const { messages } = useMessages();
  const a = messages.account;
  const queryClient = useQueryClient();
  const [value, setValue] = useState(current ?? "");
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (username: string) => apiFetch<MeResponse>("/me/username", { method: "PUT", body: { username } }),
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      void queryClient.invalidateQueries({ queryKey: ["story"] });
      setSaved(true);
    },
    onError: (failure) => setError(errorCode(failure))
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const problem = validateUsername(value);
    setError(problem);
    if (!problem) save.mutate(value);
  }

  return (
    <section>
      <h2 className={styles.sectionTitle}>{a.usernameTitle}</h2>
      {current ? null : <p className={ui.notice}>{a.usernameMissing}</p>}
      <form className={ui.stack} onSubmit={onSubmit} noValidate>
        <TextField
          label={messages.form.username}
          autoComplete="username"
          maxLength={25}
          value={value}
          onChange={(next) => {
            setValue(next);
            setSaved(false);
          }}
          hint={messages.form.usernameHint}
          error={error}
        />
        {saved ? <p className={ui.hint}>{a.usernameSaved}</p> : null}
        <div>
          <button className={ui.ghost} type="submit" disabled={save.isPending}>
            {save.isPending ? a.saving : a.usernameSave}
          </button>
        </div>
      </form>
    </section>
  );
}
