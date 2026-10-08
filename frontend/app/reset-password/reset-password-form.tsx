"use client";

import type { MeResponse, ResetPasswordRequest } from "@sffl/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { useMessages } from "../components/messages-provider";
import { TextField } from "../components/text-field";
import ui from "../components/ui.module.css";
import { apiFetch, errorCode } from "../lib/api";
import { errorMessage } from "../lib/messages";
import { hasErrors, validateNewPassword, validatePasswordConfirm } from "../lib/validation";

type Errors = Partial<Record<"password" | "passwordConfirm", string>>;

export function ResetPasswordForm({ token }: { token: string }) {
  const { messages } = useMessages();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);

  const reset = useMutation({
    mutationFn: (body: ResetPasswordRequest) =>
      apiFetch<MeResponse>("/auth/password/reset", { method: "POST", body }),
    onSuccess: (me) => queryClient.setQueryData(["me"], me),
    onError: (failure) => {
      const code = errorCode(failure);
      if (code === "WEAK_PASSWORD") setErrors({ password: code });
      else setError(code);
    }
  });

  if (!token || error === "INVALID_TOKEN" || error === "TOKEN_EXPIRED") {
    return (
      <div className={ui.stack}>
        <p className={ui.error}>{errorMessage(messages, error ?? "INVALID_TOKEN")}</p>
        <Link className={ui.secondary} href="/forgot-password">
          {messages.reset.requestNew}
        </Link>
      </div>
    );
  }

  if (reset.isSuccess) {
    return (
      <div className={ui.stack}>
        <p className={ui.notice}>{messages.reset.success}</p>
        <Link className={ui.primary} href="/account">
          {messages.reset.continue}
        </Link>
      </div>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const nextErrors: Errors = {
      password: validateNewPassword(password),
      passwordConfirm: validatePasswordConfirm(password, passwordConfirm)
    };
    setErrors(nextErrors);
    if (!hasErrors(nextErrors)) reset.mutate({ token, password });
  }

  return (
    <form className={ui.form} onSubmit={onSubmit} noValidate>
      <TextField
        label={messages.reset.password}
        type="password"
        autoComplete="new-password"
        maxLength={200}
        value={password}
        onChange={setPassword}
        hint={messages.form.passwordHint}
        error={errors.password}
      />
      <TextField
        label={messages.form.passwordConfirm}
        type="password"
        autoComplete="new-password"
        maxLength={200}
        value={passwordConfirm}
        onChange={setPasswordConfirm}
        error={errors.passwordConfirm}
      />
      {error ? (
        <p className={ui.error} role="alert">
          {errorMessage(messages, error)}
        </p>
      ) : null}
      <button className={ui.primary} type="submit" disabled={reset.isPending}>
        {reset.isPending ? messages.reset.submitting : messages.reset.submit}
      </button>
    </form>
  );
}
