import { AuthShell } from "../components/auth-shell";
import { getMessages } from "../lib/messages";
import { getRequestLocale } from "../lib/request-locale";
import { InviteView } from "./invite-view";

type PageProps = { searchParams: Promise<{ token?: string }> };

export default async function InvitePage({ searchParams }: PageProps) {
  const messages = getMessages(await getRequestLocale());
  const { token } = await searchParams;

  return (
    <AuthShell title={messages.invite.title}>
      <InviteView token={token ?? ""} />
    </AuthShell>
  );
}
