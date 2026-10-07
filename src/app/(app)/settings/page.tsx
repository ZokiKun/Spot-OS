import { Suspense } from "react";
import { pick } from "@/lib/direction-server";
import { SettingsView as SettingsView1 } from "@/components/settings/settings-view";
import { SettingsView as SettingsView2 } from "@/directions/d2/components/settings/settings-view";
import { SettingsView as SettingsView3 } from "@/directions/d3/components/settings/settings-view";

export const metadata = { title: "Settings" };

export default async function Page() {
  const View = await pick({ 1: SettingsView1, 2: SettingsView2, 3: SettingsView3 });
  return <Suspense><View /></Suspense>;
}
