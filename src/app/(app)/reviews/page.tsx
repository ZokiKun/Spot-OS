import { pick } from "@/lib/direction-server";
import { ReviewsView as ReviewsView1 } from "@/components/reviews/reviews-view";
import { ReviewsView as ReviewsView2 } from "@/directions/d2/components/reviews/reviews-view";
import { ReviewsView as ReviewsView3 } from "@/directions/d3/components/reviews/reviews-view";

export const metadata = { title: "Reviews" };

export default async function Page() {
  const View = await pick({ 1: ReviewsView1, 2: ReviewsView2, 3: ReviewsView3 });
  return <View />;
}
