import { pick } from "@/lib/direction-server";
import { LibraryView as LibraryView1 } from "@/components/library/library-view";
import { LibraryView as LibraryView2 } from "@/directions/d2/components/library/library-view";
import { LibraryView as LibraryView3 } from "@/directions/d3/components/library/library-view";

export const metadata = { title: "Library" };

export default async function Page() {
  const View = await pick({ 1: LibraryView1, 2: LibraryView2, 3: LibraryView3 });
  return <View />;
}
