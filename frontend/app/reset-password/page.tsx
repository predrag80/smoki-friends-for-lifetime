import { AuthShell } from "../components/auth-shell";
import { getMessages } from "../lib/messages";
import { getRequestLocale } from "../lib/request-locale";
import { ResetPasswordForm } from "./reset-password-form";

type PageProps = { searchParams: Promise<{ token?: string }> };

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const messages = getMessages(await getRequestLocale());
  const { token } = await searchParams;

  return (
    <AuthShell title={messages.reset.title}>
      <ResetPasswordForm token={token ?? ""} />
    </AuthShell>
  );
}
