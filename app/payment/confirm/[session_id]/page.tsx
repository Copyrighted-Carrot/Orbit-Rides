import ConfirmPaymentClient from './ConfirmPaymentClient';

export default async function ConfirmPaymentPage({ params }: { params: Promise<{ session_id: string }> }) {
    const { session_id } = await params;
    return <ConfirmPaymentClient sessionId={session_id} />;
}
