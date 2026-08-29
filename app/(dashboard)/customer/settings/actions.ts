'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: {
    display_name: string;
    phone: string;
    license_number: string;
    license_expiry: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
        .from('user_profiles')
        .upsert({
            user_id: user.id,
            display_name: formData.display_name,
            phone: formData.phone,
            license_number: formData.license_number,
            license_expiry: formData.license_expiry || null,
        });

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/customer/profile');
    revalidatePath('/customer/settings');
    return { success: true };
}
