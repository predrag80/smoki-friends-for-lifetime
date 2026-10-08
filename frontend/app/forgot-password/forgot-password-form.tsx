"use client";

import type { ForgotPasswordRequest } from "@sffl/shared";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { useMessages } from "../components/messages-provider";
import { TextField } from "../components/text-field";
import ui from "../components/ui.module.css";
import { apiFetch, errorCode } from "../lib/api";
import { errorMessage } from "../lib/messages";
import { validateEmailField } from "../lib/validation";

export function ForgotPasswordForm() {
  const { messages } = useMessages();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const forgot = useMutation({
    mutationFn: (body: ForgotPasswordRequest) => apiFetch("/auth/password/forgot", { method: "POST", body }),
    onError: (failure) => setError(errorCode(failure))
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const nextError = validateEmailField(email);
    setEmailError(nextError);
    if (!nextError) forgot.mutate({ email: email.trim() });
  }

  if (forgot.isSuccess) {
    return (
      <div className={ui.stack}>
        <p className={ui.notice}>{messages.forgot.sent}</p>
        <p className={ui.footnote}>
          <Link href="/login">{messages.forgot.back}</Link>
        </p>
      </div>
    );
  }

  return (
    <div className={ui.stack}>
      <form className={ui.form} onSubmit={onSubmit} noValidate>
        <TextField
          label={messages.form.email}
          type="email"
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={setEmail}
          error={emailError}
        />
        {error ? (
          <p className={ui.error} role="alert">
            {errorMessage(messages, error)}
          </p>
        ) : null}
        <button className={ui.primary} type="submit" disabled={forgot.isPending}>
          {forgot.isPending ? messages.forgot.submitting : messages.forgot.submit}
        </button>
      </form>
      <p className={ui.footnote}>
        <Link href="/login">{messages.forgot.back}</Link>
      </p>
    </div>
  );
}
