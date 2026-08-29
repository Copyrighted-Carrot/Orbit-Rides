import {LoginPage} from "@/app/pages/LoginPage";

export const metadata = {
    title: "Login | Orbit Rides - Admin",
    description: "Securely access the Orbit Rides admin panel to manage rentals, bookings, and more.",
};

export default function AdminLoginPage() {
    return (
        <div>
            <LoginPage isAdmin={true}/>
        </div>
    );
}