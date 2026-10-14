"use client";

import type { MeResponse } from "@sffl/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { useMessages } from "../components/messages-provider";
import { TextField } from "../components/text-field";
import ui from "../components/ui.module.css";
import { apiFetch, errorCode } from "../lib/api";
import { validateEmailField } from "../lib/validation";

/** Correct a mistyped guardian email: a new link goes to the new address and the old link stops working. */
export function GuardianEmailForm() {
  const { messages } = useMessages();
  const a = messages.account;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (guardianEmail: string) =>
      apiFetch<MeResponse>("/me/guardian-consent/resend", { method: "POST", body: { guardianEmail } }),
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      setValue("");
      setOpen(false);
      setSaved(true);
    },
    onError: (failure) => setError(errorCode(failure))
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = validateEmailField(value);
    setError(problem);
    if (!problem) save.mutate(value.trim());
  }

  if (!open) {
    return (
      <div className={ui.stack}>
        {saved ? <p className={ui.hint}>{a.guardianEmailSaved}</p> : null}
        <div>
          <button
            className={ui.ghost}
            type="button"
            onClick={() => {
              setOpen(true);
              setSaved(false);
            }}
          >
            {a.guardianEmailFix}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className={ui.stack} onSubmit={onSubmit} noValidate>
      <TextField
        label={a.guardianEmailNew}
        type="email"
        autoComplete="off"
        value={value}
        onChange={setValue}
        hint={a.guardianEmailHint}
        error={error}
      />
      <div>
        <button className={ui.primary} type="submit" disabled={save.isPending}>
          {save.isPending ? a.saving : a.guardianEmailSend}
        </button>{" "}
        <button className={ui.ghost} type="button" onClick={() => setOpen(false)}>
          {a.cancel}
        </button>
      </div>
    </form>
  );
}
