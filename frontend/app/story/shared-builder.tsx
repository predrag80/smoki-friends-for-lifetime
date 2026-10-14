"use client";

import {
  getPeriodAgeRange,
  lifePeriods,
  territories,
  type CreateSharedMomentRequest,
  type LifePeriod,
  type Territory
} from "@sffl/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { useMessages } from "../components/messages-provider";
import ui from "../components/ui.module.css";
import { apiFetch, errorCode } from "../lib/api";
import { errorMessage } from "../lib/messages";
import styles from "./story.module.css";

type SceneOption = { id: string; territory: Territory; title: string; description: string };

/** Dialog for picking the period and scene of the shared moment (everyone moved by the same number of years). */
export function SharedBuilder({ currentAge, onClose }: { currentAge: number; onClose: () => void }) {
  const { locale, messages } = useMessages();
  const s = messages.story;
  const sh = messages.shared;
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const periods = lifePeriods.filter((item) => getPeriodAgeRange(item, currentAge) !== null);
  const [period, setPeriod] = useState<LifePeriod>("TODAY");
  const [territory, setTerritory] = useState<Territory>("SOCIALIZING");
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const scenes = useQuery({
    queryKey: ["scenes", period, currentAge, locale],
    queryFn: () => apiFetch<{ scenes: SceneOption[] }>(`/scenes?period=${period}&currentAge=${currentAge}&locale=${locale}`),
    staleTime: 60 * 1000
  });
  const territoryScenes = (scenes.data?.scenes ?? []).filter((scene) => scene.territory === territory);
  const selectedScene = territoryScenes.find((scene) => scene.id === sceneId) ?? null;

  const submit = useMutation({
    mutationFn: (body: CreateSharedMomentRequest) => apiFetch("/shared", { method: "POST", body }),
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
    submit.mutate({ period, sceneId: selectedScene.id });
  }

  return (
    <div className={styles.backdrop} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialog} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className={styles.dialogHead}>
          <h2 id={titleId} className={styles.dialogTitle}>
            {sh.builderTitle}
          </h2>
          <button className={styles.close} type="button" onClick={onClose} aria-label={s.close}>
            ×
          </button>
        </div>

        <form className={ui.form} onSubmit={onSubmit}>
          <fieldset className={ui.fieldset}>
            <legend className={ui.label}>{sh.periodLabel}</legend>
            <div className={styles.territories}>
              {periods.map((item) => (
                <label key={item} className={item === period ? `${styles.choice} ${styles.choiceActive}` : styles.choice}>
                  <input
                    type="radio"
                    name="period"
                    value={item}
                    checked={item === period}
                    onChange={() => {
                      setPeriod(item);
                      setSceneId(null);
                    }}
                  />
                  {s.periods[item]}
                </label>
              ))}
            </div>
            <p className={ui.hint}>{sh.periodHints[period]}</p>
          </fieldset>

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
            {submit.isPending ? s.submitting : sh.confirm}
          </button>
        </form>
      </div>
    </div>
  );
}
