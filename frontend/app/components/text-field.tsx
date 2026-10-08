"use client";

import { useId } from "react";

import { errorMessage } from "../lib/messages";
import { useMessages } from "./messages-provider";
import ui from "./ui.module.css";

type TextFieldProps = {
  label: string;
  type?: "email" | "password" | "text";
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  hint?: string;
  /** Key of messages.errors. */
  error?: string;
  maxLength?: number;
};

/** Labelled input with hint and inline error, wired for screen readers. */
export function TextField({ label, type = "text", value, onChange, autoComplete, hint, error, maxLength }: TextFieldProps) {
  const { messages } = useMessages();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={ui.field}>
      <label className={ui.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={ui.input}
        type={type}
        value={value}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={errorId} className={ui.fieldError}>
          {errorMessage(messages, error)}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className={ui.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
