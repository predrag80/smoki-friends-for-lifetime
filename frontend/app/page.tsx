import { healthResponseSchema, type HealthResponse } from "@sffl/shared";

import { getApiBaseUrl } from "./lib/api-base-url";
import { getMessages } from "./lib/messages";
import { getRequestLocale } from "./lib/request-locale";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

async function fetchApiHealth(): Promise<HealthResponse | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/health`, { cache: "no-store" });
    return healthResponseSchema.parse(await response.json());
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const messages = getMessages(await getRequestLocale());
  const health = await fetchApiHealth();

  return (
    <main className={styles.main}>
      <h1>{messages.appName}</h1>
      <p>{messages.tagline}</p>
      <section className={styles.status}>
        <h2>{messages.apiStatus}</h2>
        {health ? (
          <pre>{JSON.stringify(health.checks, null, 2)}</pre>
        ) : (
          <p>{messages.apiUnavailable}</p>
        )}
      </section>
    </main>
  );
}
