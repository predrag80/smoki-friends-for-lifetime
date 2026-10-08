import { AuthShell } from "../components/auth-shell";
import { getMessages } from "../lib/messages";
import { getRequestLocale } from "../lib/request-locale";
import { LoginForm } from "./login-form";

type PageProps = { searchParams: Promise<{ redirect?: string; error?: string }> };

export default async function LoginPage({ searchParams }: PageProps) {
  const messages = getMessages(await getRequestLocale());
  const { redirect, error } = await searchParams;

  return (
    <AuthShell title={messages.login.title}>
      <LoginForm redirect={redirect} googleFailed={error === "google"} />
    </AuthShell>
  );
}
