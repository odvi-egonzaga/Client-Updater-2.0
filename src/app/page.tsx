import { DocumentationFeature } from '@/features/documentation';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const docId = typeof resolvedParams.doc === 'string' ? resolvedParams.doc : undefined;

  return <DocumentationFeature currentDocId={docId} />;
}
