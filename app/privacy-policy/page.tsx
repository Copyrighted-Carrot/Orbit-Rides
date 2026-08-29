import NavBar from "@/app/components/NavBar";
import Footer from "@/app/components/Footer";

export const metadata = {
    title: 'Privacy Policy | Orbit Rides',
};

export default function Page() {
    return (
        <>
            <NavBar />
            <main className="py-10 px-4 md:px-8 lg:px-14">
                <h1 className="text-4xl font-semibold">Orbit Rides - Privacy Policy</h1>

                <p>At Orbit Rides, we value your privacy and are committed to protecting your personal information. This privacy policy explains how we collect, use, share, and protect your data when you use our website and services.</p>

                <h2 className="text-2xl mt-4 font-medium">1. Data Collection</h2>

                <p>We collect limited personal information from you when you use our website. This may include:</p>
                <ul className="list-disc pl-4">
                    <li>Account Information: If you create an account, we may collect your email address and, optionally, a display name.</li>
                    <li>Booking Information: When you make a booking, we collect information such as your chosen car, rental dates, pickup location, and payment information processed by our third-party payment processor, Stripe.</li>
                    <li>Cookies: We use cookies to store user authentication information and improve your website experience. You can adjust your browser settings to manage cookie preferences.</li>
                </ul>

                <h2 className="text-2xl mt-4 font-medium">2. Data Usage</h2>

                <p>We use the collected information for the following purposes:</p>
                <ul className="list-disc pl-4">
                    <li>Providing our services: To process your bookings, deliver your rental car, and provide customer support.</li>
                    <li>Improving our services: To analyze website usage patterns (anonymously) to improve user experience and website functionality.</li>
                </ul>

                <h2 className="text-2xl mt-4 font-medium">3. Data Sharing</h2>

                <p>We may share your personal information with trusted third parties, such as:</p>
                <ul className="list-disc pl-4">
                    <li>Stripe: To process your payments securely.</li>
                    <li>Supabase: To store and manage user authentication data.</li>
                </ul>

                <p>We do not sell or rent your personal information to third parties for marketing purposes.</p>

                <h2 className="text-2xl mt-4 font-medium">4. Data Security</h2>

                <p>We take appropriate security measures to protect your personal information, including:</p>
                <ul className="list-disc pl-4">
                    <li>Data encryption: We use encryption to protect data transmitted over the internet.</li>
                    <li>Access controls: We limit access to your personal information to authorized personnel only.</li>
                    <li>Regular security reviews: We regularly review and update our security measures to address potential vulnerabilities.</li>
                </ul>

                <h2 className="text-2xl mt-4 font-medium">5. Children&#39;s Privacy</h2>

                <p>Our website and services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13.</p>

                <h2 className="text-2xl mt-4 font-medium">6. Data Retention</h2>

                <p>We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy or as required by law.</p>

                <h2 className="text-2xl mt-4 font-medium">7. Your Data Rights</h2>

                <p>You have the following rights regarding your personal information:</p>
                <ul className="list-disc pl-4">
                    <li>Access and Correction: You can access and correct your personal information by logging into your account or by contacting us. </li>
                    <li>Data Deletion: You can request the deletion of your account by contacting us. Please note that this may result in the deletion of associated booking information.</li>
                </ul>

                <h2 className="text-2xl mt-4 font-medium">8. Contact Us</h2>

                <p>If you have any questions or concerns about this Privacy Policy, please contact us at: <a className='link link-hover link-primary'
                     href="mailto:belindosamson@gmail.com">belindosamson@gmail.com</a></p>
            </main>
            <Footer />
        </>
    );
}