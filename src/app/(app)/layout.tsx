import { pick } from "@/lib/direction-server";
import { WorkspaceProvider as Workspace1 } from "@/lib/store";
import { AppShell as Shell1 } from "@/components/shell/app-shell";
import { WorkspaceProvider as Workspace2 } from "@/directions/d2/lib/store";
import { AppShell as Shell2 } from "@/directions/d2/components/shell/app-shell";
import { WorkspaceProvider as Workspace3 } from "@/directions/d3/lib/store";
import { AppShell as Shell3 } from "@/directions/d3/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [Workspace, Shell] = await pick({ 1: [Workspace1, Shell1], 2: [Workspace2, Shell2], 3: [Workspace3, Shell3] } as const);
  return (
    <Workspace>
      <Shell>{children}</Shell>
    </Workspace>
  );
}
