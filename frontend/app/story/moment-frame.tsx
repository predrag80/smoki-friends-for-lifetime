"use client";

import { getPeriodAgeRange, type LifePeriod, type MomentDto } from "@sffl/shared";

import { useMessages } from "../components/messages-provider";
import { errorMessage, format } from "../lib/messages";
import type { BuilderTarget } from "./moment-builder";
import styles from "./story.module.css";

type MomentFrameProps = {
  period: LifePeriod;
  currentAge: number;
  hasPhoto: boolean;
  moment: MomentDto | null;
  onOpen: (target: BuilderTarget) => void;
};

export function MomentFrame({ period, currentAge, hasPhoto, moment, onOpen }: MomentFrameProps) {
  const { messages } = useMessages();
  const s = messages.story;
  const periodLabel = s.periods[period];
  const available = getPeriodAgeRange(period, currentAge) !== null;

  return (
    <li className={styles.frame}>
      <span className={styles.period}>{periodLabel}</span>

      {moment?.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- private image served by the API with cookies
        <img
          className={styles.momentImage}
          src={moment.photoUrl}
          alt={format(s.momentAlt, { period: periodLabel, scene: moment.scene.title, age: moment.targetAge })}
        />
      ) : null}

      <div className={styles.frameBody}>
        {!moment && !available ? <p className={styles.frameNote}>{s.unavailable}</p> : null}

        {!moment && available ? (
          hasPhoto ? (
            <button className={styles.frameAction} type="button" onClick={() => onOpen({ period, moment: null })}>
              {s.create}
            </button>
          ) : (
            <p className={styles.frameNote}>{s.needPhoto}</p>
          )
        ) : null}

        {moment?.pending ? (
          <div className={styles.pending} role="status">
            <span className={styles.pulse} aria-hidden="true" />
            <p>{s.pending}</p>
            <p className={styles.frameNote}>{s.pendingHint}</p>
          </div>
        ) : null}

        {moment && !moment.pending ? (
          <div className={styles.momentInfo}>
            {moment.error ? <p className={styles.frameNote}>{errorMessage(messages, moment.error)}</p> : null}
            <p className={styles.momentCaption}>
              <strong>
                {moment.targetAge} {s.ageUnit}
              </strong>
              <span>{moment.scene.title}</span>
            </p>
            {moment.generationsLeft > 0 ? (
              <button className={styles.frameAction} type="button" onClick={() => onOpen({ period, moment })}>
                {moment.error ? s.retry : s.regenerate} ({format(s.left, { count: moment.generationsLeft })})
              </button>
            ) : (
              <p className={styles.frameNote}>{s.limitReached}</p>
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}
