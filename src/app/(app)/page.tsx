import { Suspense } from "react";
import { HomeView } from "@/components/home/home-view";

export default function Page() {
  return <Suspense><HomeView /></Suspense>;
}
