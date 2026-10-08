"use client";

import type { LoginRequest, MeResponse } from "@sffl/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { GoogleButton } from "../components/google-button";
import { useMessages } from "../components/messages-provider";
import ui from "../components/ui.module.css";
import { apiFetch, errorCode } from "../lib/api";
import { errorMessage } from "../lib/messages";
import { safeRedirect } from "../lib/redirect";

type LoginFormProps = { redirect?: string; googleFailed: boolean };

export function LoginForm({ redirect, googleFailed }: LoginFormProps) {
  const { messages } = useMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: (body: LoginRequest) => apiFetch<MeResponse>("/auth/login", { method: "POST", body }),
    onSuccess: (me) => {
      queryClient.setQueryData(["me"], me);
      router.push(safeRedirect(redirect));
      router.refresh();
    },
    onError: (failure) => setError(errorCode(failure))
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!email.includes("@") || !password) return setError("required");
    login.mutate({ email: email.trim(), password });
  }

  return (
    <div className={ui.stack}>
      {googleFailed ? <p className={ui.error}>{messages.login.googleError}</p> : null}
      <form className={ui.form} onSubmit={onSubmit} noValidate>
        <label className={ui.field}>
          <span className={ui.label}>{messages.form.email}</span>
          <input
            className={ui.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>{messages.form.password}</span>
          <input
            className={ui.input}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? (
          <p className={ui.error} role="alert">
            {errorMessage(messages, error)}
          </p>
        ) : null}
        <button className={ui.primary} type="submit" disabled={login.isPending}>
          {login.isPending ? messages.login.submitting : messages.login.submit}
        </button>
      </form>

      <GoogleButton />

      <p className={ui.footnote}>
        {messages.login.noAccount} <Link href="/register">{messages.login.register}</Link>
      </p>
    </div>
  );
}
