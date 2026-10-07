import { WorkspaceProvider } from "@/lib/store";
import { AppShell } from "@/components/shell/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
