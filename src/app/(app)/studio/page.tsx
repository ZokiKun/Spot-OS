import { Suspense } from "react";
import { StudioView } from "@/components/home/studio-view";

export const metadata = { title: "Studio" };

export default function StudioPage() {
  return (
    <Suspense>
      <StudioView />
    </Suspense>
  );
}
