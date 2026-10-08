"use client";

import { PASSWORD_MIN_LENGTH, type MeResponse, type RegisterRequest } from "@sffl/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { GoogleButton } from "../components/google-button";
import { useMessages } from "../components/messages-provider";
import {
  deriveProfile,
  emptyProfile,
  ProfileFields,
  toProfilePayload,
  validateProfile
} from "../components/profile-fields";
import ui from "../components/ui.module.css";
import { apiFetch, errorCode } from "../lib/api";
import { errorMessage } from "../lib/messages";

export function RegisterForm() {
  const { locale, messages } = useMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState(emptyProfile);
  const [error, setError] = useState<string | null>(null);

  const register = useMutation({
    mutationFn: (body: RegisterRequest) => apiFetch<MeResponse>("/auth/register", { method: "POST", body }),
    onSuccess: (me) => {
      queryClient.setQueryData(["me"], me);
      router.push("/account");
      router.refresh();
    },
    onError: (failure) => setError(errorCode(failure))
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.includes("@")) return setError("invalidEmail");
    if (password.length < PASSWORD_MIN_LENGTH) return setError("passwordShort");

    const derived = deriveProfile(profile);
    const profileError = validateProfile(profile, derived);
    if (profileError) return setError(profileError);

    register.mutate({ email: email.trim(), password, ...toProfilePayload(profile, derived, locale) });
  }

  return (
    <div className={ui.stack}>
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
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <span className={ui.hint}>{messages.form.passwordHint}</span>
        </label>

        <ProfileFields value={profile} onChange={setProfile} />

        {error ? (
          <p className={ui.error} role="alert">
            {errorMessage(messages, error)}
          </p>
        ) : null}

        <button className={ui.primary} type="submit" disabled={register.isPending}>
          {register.isPending ? messages.register.submitting : messages.register.submit}
        </button>
      </form>

      <GoogleButton />

      <p className={ui.footnote}>
        {messages.register.haveAccount} <Link href="/login">{messages.register.login}</Link>
      </p>
    </div>
  );
}
