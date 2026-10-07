import { Suspense } from "react";
import { pick } from "@/lib/direction-server";
import { HomeView as HomeView1 } from "@/components/home/home-view";
import { HomeView as HomeView2 } from "@/directions/d2/components/home/home-view";
import { HomeView as HomeView3 } from "@/directions/d3/components/home/home-view";

export default async function Page() {
  const View = await pick({ 1: HomeView1, 2: HomeView2, 3: HomeView3 });
  return <Suspense><View /></Suspense>;
}
