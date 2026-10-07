import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDirection } from "@/lib/direction-server";
import { StudioView } from "@/directions/d3/components/home/studio-view";

export const metadata = { title: "Studio" };

/** Only Direction 3 has a Studio page; the others show the studio as a Home view. */
export default async function Page() {
  if ((await getDirection()) !== 3) redirect("/?view=studio");
  return (
    <Suspense>
      <StudioView />
    </Suspense>
  );
}
