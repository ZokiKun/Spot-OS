import { pick } from "@/lib/direction-server";
import { ReviewDetail as ReviewDetail1 } from "@/components/reviews/review-detail";
import { ReviewDetail as ReviewDetail2 } from "@/directions/d2/components/reviews/review-detail";
import { ReviewDetail as ReviewDetail3 } from "@/directions/d3/components/reviews/review-detail";

export default async function Page({ params }: PageProps<"/reviews/[id]">) {
  const { id } = await params;
  const View = await pick({ 1: ReviewDetail1, 2: ReviewDetail2, 3: ReviewDetail3 });
  return <View id={id} />;
}
