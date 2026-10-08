import { AuthShell } from "../../components/auth-shell";
import { getMessages } from "../../lib/messages";
import { getRequestLocale } from "../../lib/request-locale";
import { CompleteSignupForm } from "./complete-form";

type PageProps = { searchParams: Promise<{ t?: string }> };

export default async function CompleteSignupPage({ searchParams }: PageProps) {
  const messages = getMessages(await getRequestLocale());
  const { t } = await searchParams;

  return (
    <AuthShell title={messages.complete.title}>
      <CompleteSignupForm token={t ?? ""} />
    </AuthShell>
  );
}
