import {redirect} from "next/navigation";

export const metadata = {
    title: 'Completing Registration | Orbit Rides',
    description: 'Completing user registration. Your account is being set up.',
};

/**
 * This page previously assigned user roles via user_metadata (insecure).
 * Roles are now assigned automatically via the DB trigger on auth.users INSERT.
 * 
 * This page now simply redirects OAuth users to their dashboard.
 * The middleware will determine their correct dashboard based on their DB role.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function AssignUserRolePage(_params: { params: Promise<{ role: string }> })
{
    // Role is auto-assigned by DB trigger, so we just redirect to the appropriate dashboard.
    // The middleware will handle access control based on the user_roles table.
    redirect('/customer/');
}