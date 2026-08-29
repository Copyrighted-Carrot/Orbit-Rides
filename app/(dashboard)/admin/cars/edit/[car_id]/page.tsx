import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EditCarPageContent from './EditCarPageContent';

export const metadata = {
    title: 'Edit Vehicle | Orbit Rides - Admin',
    description: 'Edit vehicle details in the Orbit Rides admin panel.',
};

import { Car } from '@/lib/types/models';

export default async function EditCarPage({ params }: { params: Promise<{ car_id: string }> }) {
    const { car_id } = await params;
    const supabase = await createClient();
    
    const { data: carData } = await supabase.from('cars').select('*').eq('id', car_id).single();
    if (!carData) redirect('/admin/cars');
    
    const car = { ...carData, img_urls: carData.img_urls || [] } as Car;
    
    const { data: typesData } = await supabase.from('car_types').select();
    const carTypes = (typesData || []).map(t => ({ value: t.id.toString(), label: t.type }));
    
    return <EditCarPageContent car={car} carTypes={carTypes} />;
}
