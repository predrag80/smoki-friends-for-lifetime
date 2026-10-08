import { AuthShell } from "../components/auth-shell";
import { getMessages } from "../lib/messages";
import { getRequestLocale } from "../lib/request-locale";
import { VerifyEmail } from "./verify-email";

type PageProps = { searchParams: Promise<{ token?: string }> };

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const messages = getMessages(await getRequestLocale());
  const { token } = await searchParams;

  return (
    <AuthShell title={messages.verify.title}>
      <VerifyEmail token={token ?? ""} />
    </AuthShell>
  );
}
