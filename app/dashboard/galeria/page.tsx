import AdminEventFeaturePage from "@/components/dashboard/admin-event-feature-page";

export default function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  return (
    <AdminEventFeaturePage searchParams={searchParams} feature="gallery" />
  );
}
