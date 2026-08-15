import WatchClient from './WatchClient';

export const dynamic = 'force-dynamic';

export default async function WatchPage({ params }) {
  const { id } = await params;
  return <WatchClient id={id} />;
}
