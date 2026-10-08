import { AuthShell } from "../components/auth-shell";
import { getMessages } from "../lib/messages";
import { getRequestLocale } from "../lib/request-locale";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const messages = getMessages(await getRequestLocale());

  return (
    <AuthShell title={messages.register.title} subtitle={messages.register.subtitle}>
      <RegisterForm />
    </AuthShell>
  );
}
