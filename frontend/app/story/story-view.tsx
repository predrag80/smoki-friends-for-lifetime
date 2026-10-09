"use client";

import { lifePeriods, type LifePeriod, type StoryResponse } from "@sffl/shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandBar } from "../components/brand-bar";
import { useMessages } from "../components/messages-provider";
import ui from "../components/ui.module.css";
import { apiFetch, ApiError, errorCode } from "../lib/api";
import { errorMessage } from "../lib/messages";
import { MomentBuilder, type BuilderTarget } from "./moment-builder";
import { MomentFrame } from "./moment-frame";
import { PhotoPanel } from "./photo-panel";
import styles from "./story.module.css";

export function StoryView() {
  const { messages } = useMessages();
  const s = messages.story;
  const router = useRouter();
  const [builder, setBuilder] = useState<BuilderTarget | null>(null);

  const story = useQuery({
    queryKey: ["story"],
    queryFn: () => apiFetch<StoryResponse>("/story"),
    retry: false,
    // Poll while a photo is being generated.
    refetchInterval: (query) => (query.state.data?.moments.some((moment) => moment.pending) ? 3000 : false)
  });

  useEffect(() => {
    if (story.error instanceof ApiError && story.error.status === 401) router.replace("/login?redirect=/story");
  }, [story.error, router]);

  const accountLink = (
    <Link href="/account" className={styles.barLink}>
      {s.account}
    </Link>
  );

  return (
    <div className={styles.page}>
      <BrandBar action={accountLink} />
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>{s.title}</h1>
          <p className={styles.subtitle}>{s.subtitle}</p>
        </header>

        {story.isPending ? <p className={styles.status}>{s.loading}</p> : null}
        {story.isError && !(story.error instanceof ApiError && story.error.status === 401) ? (
          <p className={ui.error}>{errorMessage(messages, errorCode(story.error))}</p>
        ) : null}

        {story.data && !story.data.canCreate ? (
          <section className={styles.card}>
            <p>{s.notReady}</p>
            <Link className={ui.primary} href="/account">
              {s.notReadyCta}
            </Link>
          </section>
        ) : null}

        {story.data?.canCreate && !story.data.aiAllowed ? (
          <section className={styles.card}>
            <p>{s.aiNotAllowed}</p>
          </section>
        ) : null}

        {story.data?.canCreate && story.data.aiAllowed ? (
          <>
            <PhotoPanel photo={story.data.sourcePhoto} />
            <section aria-label={s.stripLabel} className={styles.strip}>
              <ol className={styles.frames}>
                {lifePeriods.map((period: LifePeriod) => (
                  <MomentFrame
                    key={period}
                    period={period}
                    currentAge={story.data.currentAge}
                    hasPhoto={Boolean(story.data.sourcePhoto)}
                    moment={story.data.moments.find((moment) => moment.period === period) ?? null}
                    onOpen={setBuilder}
                  />
                ))}
              </ol>
            </section>
          </>
        ) : null}
      </main>

      {builder && story.data ? (
        <MomentBuilder target={builder} currentAge={story.data.currentAge} onClose={() => setBuilder(null)} />
      ) : null}
    </div>
  );
}
