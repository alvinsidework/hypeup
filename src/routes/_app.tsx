import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { getBootstrap } from "@/lib/hypeup/bootstrap";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const boot = await getBootstrap();
    if (!boot.user) throw redirect({ to: "/connect", search: { error: undefined, detail: undefined } });
    return { demoMode: boot.demoMode, user: boot.user };
  },
  component: DeskLayout,
});

function DeskLayout() {
  const { user, demoMode } = Route.useRouteContext();
  if (!user) return null;
  return (
    <AppShell user={user} demoMode={demoMode}>
      <Outlet />
    </AppShell>
  );
}
