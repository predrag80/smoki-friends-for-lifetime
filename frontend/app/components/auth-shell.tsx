import Link from "next/link";

import { BrandBar } from "./brand-bar";
import styles from "./auth-shell.module.css";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  wide?: boolean;
  action?: { href: string; label: string };
  children: React.ReactNode;
};

/** Red page with the Smoki bar and a paper card for forms. */
export function AuthShell({ title, subtitle, wide, action, children }: AuthShellProps) {
  return (
    <div className={styles.page}>
      <BrandBar
        action={
          action ? (
            <Link href={action.href} className={styles.action}>
              {action.label}
            </Link>
          ) : undefined
        }
      />
      <main className={styles.main}>
        <section className={wide ? `${styles.card} ${styles.wide}` : styles.card}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          <div className={styles.body}>{children}</div>
        </section>
      </main>
    </div>
  );
}
