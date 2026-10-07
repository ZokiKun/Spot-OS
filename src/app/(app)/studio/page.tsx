import { redirect } from "next/navigation";

/** Old direction-3 route: the studio overview lives on Home. */
export default function Page() {
  redirect("/?view=studio");
}
