"use client";

import type { MeResponse, RegisterRequest } from "@sffl/shared";
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
  profileFieldByServerError,
  toProfilePayload,
  validateProfile,
  type ProfileErrors
} from "../components/profile-fields";
import { TextField } from "../components/text-field";
import ui from "../components/ui.module.css";
import { apiFetch, errorCode } from "../lib/api";
import { errorMessage } from "../lib/messages";
import { hasErrors, validateEmailField, validateNewPassword, validatePasswordConfirm } from "../lib/validation";

type AccountErrors = Partial<Record<"email" | "password" | "passwordConfirm", string>>;

const accountFieldByServerError: Record<string, keyof AccountErrors> = {
  EMAIL_TAKEN: "email",
  WEAK_PASSWORD: "password"
};

export function RegisterForm() {
  const { locale, messages } = useMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [profile, setProfile] = useState(emptyProfile);
  const [accountErrors, setAccountErrors] = useState<AccountErrors>({});
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const register = useMutation({
    mutationFn: (body: RegisterRequest) => apiFetch<MeResponse>("/auth/register", { method: "POST", body }),
    onSuccess: (me) => {
      queryClient.setQueryData(["me"], me);
      router.push("/account");
      router.refresh();
    },
    onError: (failure) => {
      const code = errorCode(failure);
      const accountField = accountFieldByServerError[code];
      const profileField = profileFieldByServerError[code];
      if (accountField) setAccountErrors({ [accountField]: code });
      else if (profileField) setProfileErrors({ [profileField]: code });
      else setFormError(code);
    }
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const derived = deriveProfile(profile);
    const nextAccountErrors: AccountErrors = {
      email: validateEmailField(email),
      password: validateNewPassword(password, email),
      passwordConfirm: validatePasswordConfirm(password, passwordConfirm)
    };
    const nextProfileErrors = validateProfile(profile, derived, email);
    setAccountErrors(nextAccountErrors);
    setProfileErrors(nextProfileErrors);

    if (hasErrors(nextAccountErrors) || hasErrors(nextProfileErrors)) {
      setFormError("formHasErrors");
      return;
    }

    register.mutate({ email: email.trim(), password, ...toProfilePayload(profile, derived, locale) });
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
          error={accountErrors.email}
        />
        <TextField
          label={messages.form.password}
          type="password"
          autoComplete="new-password"
          maxLength={200}
          value={password}
          onChange={setPassword}
          hint={messages.form.passwordHint}
          error={accountErrors.password}
        />
        <TextField
          label={messages.form.passwordConfirm}
          type="password"
          autoComplete="new-password"
          maxLength={200}
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          error={accountErrors.passwordConfirm}
        />

        <ProfileFields value={profile} onChange={setProfile} errors={profileErrors} />

        {formError ? (
          <p className={ui.error} role="alert">
            {errorMessage(messages, formError)}
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
