import { AuthShell } from "../components/auth-shell";
import { getMessages } from "../lib/messages";
import { getRequestLocale } from "../lib/request-locale";
import { GuardianConsentForm } from "./guardian-form";

type PageProps = { searchParams: Promise<{ token?: string }> };

export default async function GuardianConsentPage({ searchParams }: PageProps) {
  const messages = getMessages(await getRequestLocale());
  const { token } = await searchParams;

  return (
    <AuthShell title={messages.guardian.title}>
      <GuardianConsentForm token={token ?? ""} />
    </AuthShell>
  );
}
