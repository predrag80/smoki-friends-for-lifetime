import { cookies } from "next/headers";
import Link from "next/link";

import { BrandBar } from "./components/brand-bar";
import { getMessages } from "./lib/messages";
import { getRequestLocale } from "./lib/request-locale";
import { SESSION_COOKIE_NAME } from "./lib/session-cookie";
import styles from "./page.module.css";

export default async function HomePage() {
  const messages = getMessages(await getRequestLocale());
  const home = messages.home;
  const signedIn = Boolean((await cookies()).get(SESSION_COOKIE_NAME));

  return (
    <>
      <div className={styles.hero}>
        <BrandBar
          action={
            <Link href={signedIn ? "/account" : "/login"} className={styles.barLink}>
              {signedIn ? messages.nav.account : messages.nav.login}
            </Link>
          }
        />

        <main>
          <section className={styles.intro}>
            <h1 className={styles.headline}>
              {home.headline.map((line) => (
                <span key={line} className={styles.headlineLine}>
                  {line}
                </span>
              ))}
            </h1>
            <p className={styles.lead}>{home.intro}</p>
            <div className={styles.actions}>
              <Link href={signedIn ? "/story" : "/register"} className={styles.cta}>
                {signedIn ? home.ctaSignedIn : home.cta}
              </Link>
              {signedIn ? null : (
                <p className={styles.login}>
                  {home.haveAccount} <Link href="/login">{messages.nav.login}</Link>
                </p>
              )}
            </div>
          </section>

          <section className={styles.strip} aria-label={home.stripLabel}>
            <ol className={styles.frames}>
              {home.frames.map((frame) => (
                <li key={frame.period} className={styles.frame}>
                  <span className={styles.period}>{frame.period}</span>
                  <span className={styles.age}>
                    {frame.age}
                    <span className={styles.ageUnit}>{home.ageUnit}</span>
                  </span>
                  <span className={styles.scene}>{frame.scene}</span>
                </li>
              ))}
            </ol>
          </section>
        </main>
      </div>

      <section className={styles.how}>
        <div className={styles.howInner}>
          <h2 className={styles.howTitle}>{home.howTitle}</h2>
          <ol className={styles.steps}>
            {home.steps.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
              </li>
            ))}
          </ol>
          <p className={styles.finale}>{home.finale}</p>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>{home.campaign}</p>
        <p>{home.minAge}</p>
      </footer>
    </>
  );
}
