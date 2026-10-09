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
/** Longest side sent to the server; the server keeps at most 1600 px anyway, so nothing is lost. */
const UPLOAD_MAX_SIDE = 1600;

/**
 * Shrinks phone photos (often 3–10 MB) to a ~0.3–0.6 MB JPEG before upload, so slow mobile connections
 * do not stall. Falls back to the original file when the browser cannot decode it.
 */
async function shrinkForUpload(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, UPLOAD_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function PhotoPanel({ photo }: { photo: { id: string; url: string } | null }) {
  const { messages } = useMessages();
  const s = messages.story;
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("photo", await shrinkForUpload(file), "photo.jpg");
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
