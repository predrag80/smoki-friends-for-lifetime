import { AuthShell } from "../components/auth-shell";
import { getMessages } from "../lib/messages";
import { getRequestLocale } from "../lib/request-locale";
import { AccountView } from "./account-view";

export default async function AccountPage() {
  const messages = getMessages(await getRequestLocale());

  return (
    <AuthShell title={messages.account.title} wide>
      <AccountView />
    </AuthShell>
  );
}
