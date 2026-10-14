"use client";

import type { IncomingInvite, SharedMomentDto, SharedSection as SharedSectionData } from "@sffl/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { useMessages } from "../components/messages-provider";
import { TextField } from "../components/text-field";
import ui from "../components/ui.module.css";
import { apiFetch, errorCode } from "../lib/api";
import { errorMessage, format } from "../lib/messages";
import { formatShortDateTime, parseInviteTarget, sharedWhen } from "../lib/shared";
import { SharedBuilder } from "./shared-builder";
import styles from "./story.module.css";

/** Runs an action against the API, refreshes the story and keeps the last error code. */
function useStoryAction<T = void>(run: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: run,
    onMutate: () => setError(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["story"] }),
    onError: (failure) => setError(errorCode(failure))
  });
  return { ...mutation, error };
}

/** Button that asks once more before an action that cannot be undone. */
function ConfirmAction(props: { label: string; confirmLabel: string; text: string; pending: boolean; onConfirm: () => void }) {
  const { messages } = useMessages();
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button className={ui.ghost} type="button" onClick={() => setAsking(true)}>
        {props.label}
      </button>
    );
  }
  return (
    <div className={styles.confirmBox}>
      <p>{props.text}</p>
      <div className={styles.actions}>
        <button className={ui.danger} type="button" disabled={props.pending} onClick={props.onConfirm}>
          {props.confirmLabel}
        </button>
        <button className={ui.ghost} type="button" onClick={() => setAsking(false)}>
          {messages.shared.cancel}
        </button>
      </div>
    </div>
  );
}

function SharedPhoto({ moment }: { moment: SharedMomentDto }) {
  const { messages } = useMessages();
  const sh = messages.shared;
  return (
    <div className={styles.sharedPhoto}>
      {moment.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- private image served by the API with cookies
        <img className={styles.momentImage} src={moment.photoUrl} alt={format(sh.photoAlt, { scene: moment.scene.title })} />
      ) : null}
      {moment.pending ? (
        <div className={styles.sharedOverlay} role="status">
          <span className={styles.pulse} aria-hidden="true" />
          <p>{sh.pending}</p>
          <p className={styles.frameNote}>{sh.pendingHint}</p>
        </div>
      ) : null}
      {!moment.pending && !moment.photoUrl ? (
        <div className={styles.sharedOverlay}>
          <p>{moment.error ? errorMessage(messages, moment.error) : sh.waiting}</p>
        </div>
      ) : null}
    </div>
  );
}

function SceneHeading({ moment }: { moment: SharedMomentDto }) {
  const { messages } = useMessages();
  return (
    <div>
      <h3 className={styles.sharedScene}>{moment.scene.title}</h3>
      <p className={ui.hint}>
        {messages.story.periods[moment.period]} · {sharedWhen(messages, moment.period, moment.yearsOffset)}
      </p>
    </div>
  );
}

function People({ moment }: { moment: SharedMomentDto }) {
  const { messages } = useMessages();
  const sh = messages.shared;
  return (
    <div>
      <p className={ui.label}>{sh.people}</p>
      <ul className={styles.people}>
        {moment.participants.map((person, index) => (
          <li key={`${person.name}-${index}`}>
            {person.name}
            {person.role === "OWNER" ? ` · ${sh.owner}` : ""}
            {person.isMe ? ` (${sh.me})` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InviteForm() {
  const { messages } = useMessages();
  const sh = messages.shared;
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const send = useStoryAction((body: NonNullable<ReturnType<typeof parseInviteTarget>>) =>
    apiFetch("/shared/invites", { method: "POST", body })
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(false);
    const target = parseInviteTarget(value);
    setFieldError(target ? undefined : "inviteTargetInvalid");
    if (!target) return;
    send.mutate(target, {
      onSuccess: () => {
        setValue("");
        setSent(true);
      }
    });
  }

  return (
    <form className={ui.stack} onSubmit={onSubmit} noValidate>
      <TextField
        label={sh.inviteLabel}
        value={value}
        onChange={(next) => {
          setValue(next);
          setSent(false);
        }}
        hint={sh.inviteHint}
        error={fieldError ?? send.error ?? undefined}
        maxLength={254}
      />
      {sent ? <p className={ui.hint}>{sh.inviteSent}</p> : null}
      <div>
        <button className={ui.primary} type="submit" disabled={send.isPending}>
          {send.isPending ? sh.inviteSending : sh.inviteSend}
        </button>
      </div>
    </form>
  );
}

function MyMoment({ moment }: { moment: SharedMomentDto }) {
  const { messages } = useMessages();
  const sh = messages.shared;
  const cancel = useStoryAction((id: string) => apiFetch(`/shared/invites/${id}`, { method: "DELETE" }));
  const regenerate = useStoryAction(() => apiFetch("/shared/regenerate", { method: "POST" }));
  const remove = useStoryAction(() => apiFetch("/shared", { method: "DELETE" }));
  const friends = moment.participants.filter((person) => person.role === "FRIEND").length;
  const error = cancel.error ?? regenerate.error ?? remove.error;

  return (
    <article className={styles.sharedCard}>
      <SharedPhoto moment={moment} />
      <div className={styles.sharedBody}>
        <SceneHeading moment={moment} />
        <People moment={moment} />

        {friends > 0 && !moment.pending ? (
          moment.generationsLeft > 0 ? (
            <div>
              <button className={ui.secondary} type="button" disabled={regenerate.isPending} onClick={() => regenerate.mutate()}>
                {sh.regenerate} ({format(sh.left, { count: moment.generationsLeft })})
              </button>
            </div>
          ) : (
            <p className={ui.hint}>{messages.story.limitReached}</p>
          )
        ) : null}

        {moment.invites.length > 0 ? (
          <div>
            <p className={ui.label}>{sh.invitesTitle}</p>
            <ul className={styles.inviteList}>
              {moment.invites.map((invite) => (
                <li key={invite.id}>
                  <span>
                    {invite.label} ·{" "}
                    {invite.status === "EXPIRED"
                      ? sh.inviteExpired
                      : format(sh.inviteExpires, { date: formatShortDateTime(invite.expiresAt) })}
                  </span>
                  <button className={ui.ghost} type="button" disabled={cancel.isPending} onClick={() => cancel.mutate(invite.id)}>
                    {sh.cancelInvite}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {moment.slotsLeft > 0 ? (
          <>
            <p className={ui.hint}>{format(sh.slotsLeft, { count: moment.slotsLeft })}</p>
            <InviteForm />
          </>
        ) : (
          <p className={ui.hint}>{sh.full}</p>
        )}

        {error ? (
          <p className={ui.error} role="alert">
            {errorMessage(messages, error)}
          </p>
        ) : null}

        <ConfirmAction
          label={sh.remove}
          confirmLabel={sh.removeConfirm}
          text={sh.removeText}
          pending={remove.isPending}
          onConfirm={() => remove.mutate()}
        />
      </div>
    </article>
  );
}

function JoinedMoment({ moment }: { moment: SharedMomentDto }) {
  const { messages } = useMessages();
  const sh = messages.shared;
  const leave = useStoryAction(() => apiFetch(`/shared/${moment.id}/leave`, { method: "POST" }));
  return (
    <article className={styles.sharedCard}>
      <SharedPhoto moment={moment} />
      <div className={styles.sharedBody}>
        <SceneHeading moment={moment} />
        <p className={ui.hint}>{format(sh.by, { name: moment.owner ?? "" })}</p>
        <People moment={moment} />
        {leave.error ? <p className={ui.error}>{errorMessage(messages, leave.error)}</p> : null}
        <ConfirmAction
          label={sh.leave}
          confirmLabel={sh.leaveConfirm}
          text={sh.leaveText}
          pending={leave.isPending}
          onConfirm={() => leave.mutate()}
        />
      </div>
    </article>
  );
}

function IncomingInvites({ invites }: { invites: IncomingInvite[] }) {
  const { messages } = useMessages();
  const sh = messages.shared;
  const respond = useStoryAction(({ id, action }: { id: string; action: "accept" | "decline" }) =>
    apiFetch(`/shared/invites/${id}/${action}`, { method: "POST" })
  );
  return (
    <section className={styles.card} aria-label={sh.incomingTitle}>
      <h3 className={styles.sectionTitle}>{sh.incomingTitle}</h3>
      <ul className={styles.inviteList}>
        {invites.map((invite) => (
          <li key={invite.id}>
            <span>
              {format(sh.incomingText, {
                from: invite.from,
                scene: invite.sceneTitle,
                when: sharedWhen(messages, invite.period, invite.yearsOffset)
              })}
            </span>
            <span className={styles.actions}>
              <button
                className={ui.primary}
                type="button"
                disabled={respond.isPending}
                onClick={() => respond.mutate({ id: invite.id, action: "accept" })}
              >
                {sh.accept}
              </button>
              <button
                className={ui.ghost}
                type="button"
                disabled={respond.isPending}
                onClick={() => respond.mutate({ id: invite.id, action: "decline" })}
              >
                {sh.decline}
              </button>
            </span>
          </li>
        ))}
      </ul>
      {respond.error ? (
        <p className={ui.error} role="alert">
          {errorMessage(messages, respond.error)}
        </p>
      ) : null}
    </section>
  );
}

/** "Zajednički trenutak": the user's own shared photo, photos of friends and invites waiting for an answer. */
export function SharedSection({ shared, currentAge }: { shared: SharedSectionData; currentAge: number }) {
  const { messages } = useMessages();
  const sh = messages.shared;
  const [building, setBuilding] = useState(false);

  return (
    <section className={styles.shared} aria-labelledby="shared-title">
      <header className={styles.header}>
        <h2 id="shared-title" className={styles.sharedTitle}>
          {sh.title}
        </h2>
        <p className={styles.subtitle}>{sh.intro}</p>
      </header>

      {shared.incoming.length > 0 ? <IncomingInvites invites={shared.incoming} /> : null}

      {!shared.mine && !shared.unlocked ? (
        <section className={styles.card}>
          <p>{sh.locked}</p>
        </section>
      ) : null}

      {!shared.mine && shared.unlocked && !shared.username ? (
        <section className={styles.card}>
          <p>{sh.needUsername}</p>
          <Link className={ui.primary} href="/account">
            {sh.needUsernameCta}
          </Link>
        </section>
      ) : null}

      {!shared.mine && shared.unlocked && shared.username ? (
        <section className={styles.card}>
          <button className={ui.primary} type="button" onClick={() => setBuilding(true)}>
            {sh.start}
          </button>
        </section>
      ) : null}

      {shared.mine ? <MyMoment moment={shared.mine} /> : null}

      {shared.joined.length > 0 ? (
        <>
          <h3 className={styles.sharedSubtitle}>{sh.joinedTitle}</h3>
          {shared.joined.map((moment) => (
            <JoinedMoment key={moment.id} moment={moment} />
          ))}
        </>
      ) : null}

      {building ? <SharedBuilder currentAge={currentAge} onClose={() => setBuilding(false)} /> : null}
    </section>
  );
}
