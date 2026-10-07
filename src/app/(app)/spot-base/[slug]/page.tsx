import { pick } from "@/lib/direction-server";
import { SpotBaseView as SpotBaseView1 } from "@/components/spot-base/spot-base-view";
import { SpotBaseView as SpotBaseView2 } from "@/directions/d2/components/spot-base/spot-base-view";
import { SpotBaseView as SpotBaseView3 } from "@/directions/d3/components/spot-base/spot-base-view";

export default async function Page({ params }: PageProps<"/spot-base/[slug]">) {
  const { slug } = await params;
  const View = await pick({ 1: SpotBaseView1, 2: SpotBaseView2, 3: SpotBaseView3 });
  return <View slug={slug} />;
}
