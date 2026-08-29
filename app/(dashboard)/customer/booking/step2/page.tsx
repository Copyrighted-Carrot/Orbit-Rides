import { redirect } from 'next/navigation';
import QRCheckoutContent from './QRCheckoutContent';

export const metadata = {
    title: 'Complete Payment | Orbit Rides',
    description: 'Scan the QR code to complete your booking payment.',
};

export default async function BookingStep2({ searchParams }: { searchParams: Promise<{ car: string; rentDate: string; deliveryLocation: string }> }) {
    const { car: carJSON, rentDate: rentDateJSON, deliveryLocation: deliveryLocationJSON } = await searchParams;
    if (!carJSON || !rentDateJSON || !deliveryLocationJSON) redirect('/customer/');
    return <QRCheckoutContent carJSON={carJSON} rentDateJSON={rentDateJSON} deliveryLocationJSON={deliveryLocationJSON} />;
}
