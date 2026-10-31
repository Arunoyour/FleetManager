import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import { BottomNav, SideNav } from "@/components/nav";
import { Icon } from "@/components/icon";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const logout = (
    <form action={logoutAction}>
      <button type="submit" className="btn-ghost" aria-label="Log out">
        <Icon name="logout" />
        <span className="max-md:sr-only">Log out</span>
      </button>
    </form>
  );
  return (
    <div className="flex min-h-dvh">
      <SideNav userName={user.name} logout={logout} />
      <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-8">{children}</div>
      <BottomNav />
    </div>
  );
}
