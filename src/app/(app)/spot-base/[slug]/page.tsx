import { SpotBaseView } from "@/components/spot-base/spot-base-view";

export default async function SpotBasePage({ params }: PageProps<"/spot-base/[slug]">) {
  const { slug } = await params;
  return <SpotBaseView slug={slug} />;
}
