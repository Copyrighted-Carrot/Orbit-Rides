import SignupPage from "@/app/pages/SignupPage";

export const metadata = {
    title: "Signup | Orbit Rides - Admin",
    description: "Become an Orbit Rides administrator. Sign up now to gain access to powerful tools for managing rentals, bookings, and business operations.",
};

export default function AdminSignupPage() {
    return (
        <div>
            <SignupPage isAdmin={true}/>
        </div>
    );
}