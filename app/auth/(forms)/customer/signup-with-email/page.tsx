import SignupWithEmailPage from "@/app/pages/SignupWithEmailPage";

export const metadata = {
    title: "Signup With Email | Orbit Rides",
    description: "Join the Orbit Rides community! Create an account to easily book your next car rental, access exclusive deals, and manage your bookings with ease.",
};

export default function CustomerSignupWithEmailPage()
{
    return <SignupWithEmailPage isAdmin={false}/>;
}