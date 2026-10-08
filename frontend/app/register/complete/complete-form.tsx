"use client";

import type { CompleteOAuthSignupRequest, MeResponse, OAuthSignupInfoResponse } from "@sffl/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useMessages } from "../../components/messages-provider";
import {
  deriveProfile,
  emptyProfile,
  ProfileFields,
  profileFieldByServerError,
  toProfilePayload,
  validateProfile,
  type ProfileErrors
} from "../../components/profile-fields";
import ui from "../../components/ui.module.css";
import { apiFetch, errorCode } from "../../lib/api";
import { errorMessage, format } from "../../lib/messages";
import { hasErrors } from "../../lib/validation";

export function CompleteSignupForm({ token }: { token: string }) {
  const { locale, messages } = useMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState(emptyProfile);
  const [error, setError] = useState<string | null>(null);
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});

  const info = useQuery({
    queryKey: ["oauth-signup", token],
    queryFn: () => apiFetch<OAuthSignupInfoResponse>("/auth/google/signup-info", { method: "POST", body: { token } }),
    enabled: token.length > 0,
    retry: false
  });

  const complete = useMutation({
    mutationFn: (body: CompleteOAuthSignupRequest) =>
      apiFetch<MeResponse>("/auth/google/complete", { method: "POST", body }),
    onSuccess: (me) => {
      queryClient.setQueryData(["me"], me);
      router.push("/account");
      router.refresh();
    },
    onError: (failure) => {
      const code = errorCode(failure);
      const field = profileFieldByServerError[code];
      if (field) setProfileErrors({ [field]: code });
      else setError(code);
    }
  });

  if (!token || info.isError) {
    return (
      <div className={ui.stack}>
        <p className={ui.error}>{errorMessage(messages, token ? errorCode(info.error) : "INVALID_TOKEN")}</p>
        <Link className={ui.secondary} href="/login">
          {messages.complete.retry}
        </Link>
      </div>
    );
  }

  if (!info.data) return <p className={ui.hint}>{messages.complete.loading}</p>;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const derived = deriveProfile(profile);
    const nextErrors = validateProfile(profile, derived, info.data?.email);
    setProfileErrors(nextErrors);
    if (hasErrors(nextErrors)) return setError("formHasErrors");
    complete.mutate({ token, ...toProfilePayload(profile, derived, locale) });
  }

  return (
    <form className={ui.form} onSubmit={onSubmit} noValidate>
      <p className={ui.hint}>{format(messages.complete.subtitle, { email: info.data.email })}</p>
      <ProfileFields value={profile} onChange={setProfile} errors={profileErrors} />
      {error ? (
        <p className={ui.error} role="alert">
          {errorMessage(messages, error)}
        </p>
      ) : null}
      <button className={ui.primary} type="submit" disabled={complete.isPending}>
        {complete.isPending ? messages.complete.submitting : messages.complete.submit}
      </button>
    </form>
  );
}
