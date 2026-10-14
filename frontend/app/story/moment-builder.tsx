"use client";

import {
  territories,
  type CreateMomentRequest,
  type LifePeriod,
  type MomentDto,
  type RegenerateMomentRequest,
  type Territory
} from "@sffl/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { useMessages } from "../components/messages-provider";
import ui from "../components/ui.module.css";
import { apiFetch, errorCode } from "../lib/api";
import { errorMessage, format } from "../lib/messages";
import styles from "./story.module.css";

export type BuilderTarget = { period: LifePeriod; moment: MomentDto | null };

type SceneOption = { id: string; territory: Territory; title: string; description: string };

type MomentBuilderProps = { target: BuilderTarget; currentAge: number; onClose: () => void };

/** Dialog for choosing territory and scene (the app picks the age), then starting the photo generation. */
export function MomentBuilder({ target, currentAge, onClose }: MomentBuilderProps) {
  const { locale, messages } = useMessages();
  const s = messages.story;
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [territory, setTerritory] = useState<Territory>(target.moment?.scene.territory ?? "RELAXING");
  const [sceneId, setSceneId] = useState<string | null>(target.moment?.scene.id ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const scenes = useQuery({
    queryKey: ["scenes", target.period, currentAge, locale],
    queryFn: () =>
      apiFetch<{ scenes: SceneOption[] }>(`/scenes?period=${target.period}&currentAge=${currentAge}&locale=${locale}`),
    staleTime: 60 * 1000
  });
  const territoryScenes = (scenes.data?.scenes ?? []).filter((scene) => scene.territory === territory);
  const selectedScene = territoryScenes.find((scene) => scene.id === sceneId) ?? null;

  const submit = useMutation({
    mutationFn: () =>
      target.moment
        ? apiFetch(`/moments/${target.moment.id}/regenerate`, {
            method: "POST",
            body: { sceneId: sceneId ?? undefined } satisfies RegenerateMomentRequest
          })
        : apiFetch("/moments", {
            method: "POST",
            body: { period: target.period, sceneId: sceneId ?? "" } satisfies CreateMomentRequest
          }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["story"] });
      onClose();
    },
    onError: (failure) => setError(errorCode(failure))
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!selectedScene) return setError("SCENE_NOT_AVAILABLE");
    submit.mutate();
  }

  const periodLabel = s.periods[target.period];
  const ageNote = target.moment
    ? format(s.ageKept, { age: target.moment.targetAge })
    : target.period === "TODAY"
      ? format(s.ageFixed, { age: currentAge })
      : s.ageSurprise;

  return (
    <div className={styles.backdrop} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialog}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={styles.dialogHead}>
          <h2 id={titleId} className={styles.dialogTitle}>
            {format(target.moment ? s.builderRegenerateTitle : s.builderTitle, { period: periodLabel })}
          </h2>
          <button className={styles.close} type="button" onClick={onClose} aria-label={s.close}>
            ×
          </button>
        </div>

        <form className={ui.form} onSubmit={onSubmit}>
          <p className={ui.hint}>{ageNote}</p>

          <fieldset className={ui.fieldset}>
            <legend className={ui.label}>{s.territoryLabel}</legend>
            <div className={styles.territories}>
              {territories.map((item) => (
                <label key={item} className={item === territory ? `${styles.choice} ${styles.choiceActive}` : styles.choice}>
                  <input
                    type="radio"
                    name="territory"
                    value={item}
                    checked={item === territory}
                    onChange={() => setTerritory(item)}
                  />
                  {s.territories[item]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={ui.fieldset}>
            <legend className={ui.label}>{s.sceneLabel}</legend>
            {scenes.isPending ? <p className={ui.hint}>{s.scenesLoading}</p> : null}
            {scenes.isError ? <p className={ui.error}>{errorMessage(messages, errorCode(scenes.error))}</p> : null}
            {scenes.data && territoryScenes.length === 0 ? <p className={ui.hint}>{s.noScenes}</p> : null}
            <div className={styles.scenes}>
              {territoryScenes.map((scene) => (
                <label key={scene.id} className={scene.id === sceneId ? `${styles.scene} ${styles.choiceActive}` : styles.scene}>
                  <input
                    type="radio"
                    name="scene"
                    value={scene.id}
                    checked={scene.id === sceneId}
                    onChange={() => setSceneId(scene.id)}
                  />
                  <span className={styles.sceneTitle}>{scene.title}</span>
                  <span className={styles.sceneText}>{scene.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error ? (
            <p className={ui.error} role="alert">
              {errorMessage(messages, error)}
            </p>
          ) : null}

          <button className={ui.primary} type="submit" disabled={submit.isPending || !selectedScene}>
            {submit.isPending ? s.submitting : s.confirm}
          </button>
        </form>
      </div>
    </div>
  );
}
