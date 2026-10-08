import Link from "next/link";

import styles from "./brand-bar.module.css";

/** Top bar shared by all pages: Smoki wordmark on the left, one action on the right. */
export function BrandBar({ action }: { action?: React.ReactNode }) {
  return (
    <header className={styles.bar}>
      <Link href="/" className={styles.wordmark}>
        <span className={styles.smoki}>Smoki</span>
        <span className={styles.product}>Friend for a Lifetime</span>
      </Link>
      {action}
    </header>
  );
}
