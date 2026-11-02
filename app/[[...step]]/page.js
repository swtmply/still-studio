import Studio from '../../components/studio';

export const dynamicParams = false;
export function generateStaticParams() {
  return [[], ['shoot'], ['select'], ['style'], ['share']].map((step) => ({ step }));
}

export default function StudioPage() {
  return <Studio />;
}
