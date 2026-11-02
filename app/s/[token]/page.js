import Viewer from '../../../components/viewer';

export const metadata = { title: 'Your little moments — Still Studio', robots: { index: false, follow: false } };
export default async function MomentsPage({ params }) {
  const { token } = await params;
  return <Viewer token={token}/>;
}
