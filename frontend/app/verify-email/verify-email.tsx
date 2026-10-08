"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { useMessages } from "../components/messages-provider";
import ui from "../components/ui.module.css";
import { apiFetch, errorCode } from "../lib/api";
import { errorMessage } from "../lib/messages";

export function VerifyEmail({ token }: { token: string }) {
  const { messages } = useMessages();
  const started = useRef(false);
  const verify = useMutation({
    mutationFn: () => apiFetch<{ verified: boolean }>("/auth/verify-email", { method: "POST", body: { token } })
  });

  useEffect(() => {
    // The link is single-use; make sure it is sent once even in React strict mode.
    if (!token || started.current) return;
    started.current = true;
    verify.mutate();
  }, [token, verify]);

  if (!token) return <p className={ui.error}>{errorMessage(messages, "INVALID_TOKEN")}</p>;

  if (verify.isError) {
    return (
      <div className={ui.stack}>
        <p className={ui.error}>{errorMessage(messages, errorCode(verify.error))}</p>
        <Link className={ui.secondary} href="/account">
          {messages.verify.continue}
        </Link>
      </div>
    );
  }

  if (verify.isSuccess) {
    return (
      <div className={ui.stack}>
        <p className={ui.notice}>{messages.verify.success}</p>
        <Link className={ui.primary} href="/account">
          {messages.verify.continue}
        </Link>
      </div>
    );
  }

  return <p className={ui.hint}>{messages.verify.working}</p>;
}
