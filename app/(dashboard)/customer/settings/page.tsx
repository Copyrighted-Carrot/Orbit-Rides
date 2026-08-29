import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SettingsPageContent from './SettingsPageContent';

export const metadata = {
    title: 'Account Settings | Orbit Rides',
    description: 'Update your profile and account settings.',
};

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/customer/login');
    }

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    return <SettingsPageContent user={user} profile={profile} />;
}
