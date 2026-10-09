"use client";

import type { PhotoUploadResponse } from "@sffl/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ChangeEvent } from "react";

import { useMessages } from "../components/messages-provider";
import ui from "../components/ui.module.css";
import { apiFetch, errorCode } from "../lib/api";
import { errorMessage } from "../lib/messages";
import styles from "./story.module.css";

const MAX_BYTES = 10 * 1024 * 1024;

export function PhotoPanel({ photo }: { photo: { id: string; url: string } | null }) {
  const { messages } = useMessages();
  const s = messages.story;
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("photo", file);
      return apiFetch<PhotoUploadResponse>("/photos", { method: "POST", form });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["story"] }),
    onError: (failure) => setError(errorCode(failure))
  });

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError(null);
    if (!file) return;
    if (file.size > MAX_BYTES) return setError("PHOTO_TOO_LARGE");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("PHOTO_UNSUPPORTED_FORMAT");
    upload.mutate(file);
  }

  return (
    <section className={styles.photoPanel}>
      <div className={styles.photoPreview}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- private image served by the API with cookies
          <img src={photo.url} alt={s.photoAlt} />
        ) : (
          <span className={styles.photoPlaceholder} aria-hidden="true" />
        )}
      </div>
      <div className={styles.photoBody}>
        <h2 className={styles.sectionTitle}>{s.photoTitle}</h2>
        <p className={ui.hint}>{s.photoIntro}</p>
        <ul className={styles.tips}>
          {s.photoTips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        {error ? (
          <p className={ui.error} role="alert">
            {errorMessage(messages, error)}
          </p>
        ) : null}
        <input
          ref={input}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFile}
          tabIndex={-1}
        />
        <button
          className={photo ? ui.ghost : styles.uploadButton}
          type="button"
          onClick={() => input.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? s.uploading : photo ? s.changePhoto : s.choosePhoto}
        </button>
      </div>
    </section>
  );
}
