import { AuthShell } from "../components/auth-shell";
import { getMessages } from "../lib/messages";
import { getRequestLocale } from "../lib/request-locale";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const messages = getMessages(await getRequestLocale());

  return (
    <AuthShell title={messages.forgot.title} subtitle={messages.forgot.subtitle}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
