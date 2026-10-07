import { ReviewDetail } from "@/components/reviews/review-detail";

export default async function Page({ params }: PageProps<"/reviews/[id]">) {
  const { id } = await params;
  return <ReviewDetail id={id} />;
}
