"use client";

import type { MeResponse } from "@sffl/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useMessages } from "../components/messages-provider";
import ui from "../components/ui.module.css";
import { apiFetch, ApiError, errorCode } from "../lib/api";
import { errorMessage, format } from "../lib/messages";
import styles from "./account-view.module.css";

type StepProps = { title: string; done: boolean; children: React.ReactNode };

function Step({ title, done, children }: StepProps) {
  const { messages } = useMessages();
  return (
    <li className={styles.step}>
      <div className={styles.stepHead}>
        <h3 className={styles.stepTitle}>{title}</h3>
        <span className={done ? styles.done : styles.waiting}>
          {done ? messages.account.done : messages.account.waiting}
        </span>
      </div>
      {children}
    </li>
  );
}

export function AccountView() {
  const { messages } = useMessages();
  const a = messages.account;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<"email" | "guardian" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<MeResponse>("/auth/me"),
    retry: false
  });

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) {
      router.replace("/login?redirect=/account");
    }
  }, [me.error, router]);

  const onError = (failure: unknown) => setError(errorCode(failure));
  const updateMe = (data: MeResponse) => queryClient.setQueryData(["me"], data);

  const resendEmail = useMutation({
    mutationFn: () => apiFetch("/auth/verify-email/resend", { method: "POST" }),
    onSuccess: () => setSent("email"),
    onError
  });
  const resendGuardian = useMutation({
    mutationFn: () => apiFetch<MeResponse>("/me/guardian-consent/resend", { method: "POST", body: {} }),
    onSuccess: (data) => {
      updateMe(data);
      setSent("guardian");
    },
    onError
  });
  const photoConsent = useMutation({
    mutationFn: (granted: boolean) =>
      apiFetch<MeResponse>("/me/consents", { method: "POST", body: { type: "PHOTO_PROCESSING", granted } }),
    onSuccess: updateMe,
    onError
  });
  const logout = useMutation({
    mutationFn: () => apiFetch("/auth/logout", { method: "POST" }),
    onSettled: () => {
      queryClient.clear();
      router.push("/");
      router.refresh();
    }
  });
  const deleteAccount = useMutation({
    mutationFn: () => apiFetch("/me", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.clear();
      router.push("/");
      router.refresh();
    },
    onError
  });

  if (me.isPending || (me.error instanceof ApiError && me.error.status === 401)) {
    return <p className={ui.hint}>{a.loading}</p>;
  }
  if (me.isError) return <p className={ui.error}>{errorMessage(messages, errorCode(me.error))}</p>;

  const { user, consents, guardian, readiness } = me.data;
  const signIn = [user.hasPassword ? a.signInPassword : null, user.providers.includes("GOOGLE") ? a.signInGoogle : null]
    .filter(Boolean)
    .join(", ");

  return (
    <div className={styles.view}>
      {error ? (
        <p className={ui.error} role="alert">
          {errorMessage(messages, error)}
        </p>
      ) : null}

      <section>
        <h2 className={styles.sectionTitle}>{a.stepsTitle}</h2>
        {readiness.canCreate ? (
          <div className={styles.ready}>
            <p className={ui.notice}>{a.ready}</p>
            <Link className={ui.primary} href="/story">
              {a.storyCta}
            </Link>
          </div>
        ) : null}
        <ol className={styles.steps}>
          <Step title={a.emailStep} done={user.emailVerified}>
            {user.emailVerified ? (
              <p className={ui.hint}>{a.emailDone}</p>
            ) : (
              <div className={styles.stepBody}>
                <p className={ui.hint}>{format(a.emailPending, { email: user.email })}</p>
                <button
                  className={ui.ghost}
                  type="button"
                  onClick={() => resendEmail.mutate()}
                  disabled={resendEmail.isPending || sent === "email"}
                >
                  {sent === "email" ? a.sent : a.resend}
                </button>
              </div>
            )}
          </Step>

          {guardian.status !== "NOT_REQUIRED" ? (
            <Step title={a.guardianStep} done={guardian.status === "CONFIRMED"}>
              {guardian.status === "CONFIRMED" ? (
                <p className={ui.hint}>{a.guardianDone}</p>
              ) : (
                <div className={styles.stepBody}>
                  <p className={ui.hint}>{format(a.guardianPending, { email: guardian.email ?? "" })}</p>
                  <button
                    className={ui.ghost}
                    type="button"
                    onClick={() => resendGuardian.mutate()}
                    disabled={resendGuardian.isPending || sent === "guardian"}
                  >
                    {sent === "guardian" ? a.sent : a.resend}
                  </button>
                </div>
              )}
            </Step>
          ) : null}

          <Step title={a.photoStep} done={consents.PHOTO_PROCESSING}>
            <div className={styles.stepBody}>
              <p className={ui.hint}>{consents.PHOTO_PROCESSING ? a.photoDone : a.photoText}</p>
              <button
                className={ui.ghost}
                type="button"
                onClick={() => photoConsent.mutate(!consents.PHOTO_PROCESSING)}
                disabled={photoConsent.isPending}
              >
                {consents.PHOTO_PROCESSING ? a.revoke : a.grant}
              </button>
            </div>
          </Step>
        </ol>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>{a.profileTitle}</h2>
        <dl className={styles.profile}>
          <dt>{a.profileEmail}</dt>
          <dd>{user.email}</dd>
          <dt>{a.profileBirth}</dt>
          <dd>
            {messages.months[user.birthMonth - 1]} {user.birthYear}.
          </dd>
          <dt>{a.profileMarket}</dt>
          <dd>{messages.markets[user.market]}</dd>
          <dt>{a.profileSignIn}</dt>
          <dd>{signIn}</dd>
        </dl>
        <button className={ui.ghost} type="button" onClick={() => logout.mutate()} disabled={logout.isPending}>
          {a.logout}
        </button>
      </section>

      <section className={styles.danger}>
        <h2 className={styles.sectionTitle}>{a.deleteTitle}</h2>
        <p className={ui.hint}>{a.deleteText}</p>
        {confirmDelete ? (
          <div className={styles.actions}>
            <button
              className={ui.danger}
              type="button"
              onClick={() => deleteAccount.mutate()}
              disabled={deleteAccount.isPending}
            >
              {a.deleteConfirm}
            </button>
            <button className={ui.ghost} type="button" onClick={() => setConfirmDelete(false)}>
              {a.cancel}
            </button>
          </div>
        ) : (
          <button className={ui.ghost} type="button" onClick={() => setConfirmDelete(true)}>
            {a.deleteButton}
          </button>
        )}
      </section>
    </div>
  );
}
