import Link from "next/link";
import NavBar from "@/app/components/NavBar";
import Footer from "@/app/components/Footer";
import * as m from "framer-motion/m"
import HomePageFeaturedCarsCarousel from "@/app/(app)/HomePageFeaturedCarsCarousel";
import { getCatalogue, type FleetCard } from '@/lib/fleet/catalogue';
import { parseSearchParams } from '@/lib/fleet/search';
import { FaTags, FaCarSide, FaHeadset } from "react-icons/fa6";
import { IconType } from "react-icons";

export const metadata = {
    title: 'Orbit Rides - Adventure in Every Orbit',
};

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

const fadeInRight = {
    hidden: { opacity: 0, x: 15 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8 } },
};

const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.8 } },
};

const stagger = {
    hidden: { opacity: 1 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2,
        },
    },
};

const fadeInFromBottom = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

export default async function HomePage() {
    let featuredCars: FleetCard[] = [];
    let fleetError = false;
    try { featuredCars = (await getCatalogue(parseSearchParams({}))).vehicles.slice(0, 6); }
    catch { fleetError = true; }

    return (
        <div className="bg-slate-950 text-slate-100 min-h-screen selection:bg-emerald-500 selection:text-slate-950 font-sans overflow-x-hidden">
            <NavBar position="fixed" />

            <main className="flex flex-col gap-24">
                {/* HERO SECTION — BMW CINEMATIC EXPERIENCE */}
                <m.section
                    className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Background Video with Multi-layer Ambient Gradients */}
                    <video
                        className="absolute inset-0 w-full h-full object-cover scale-105 filter brightness-[0.65] contrast-125 transition-transform duration-1000"
                        src="/Videos/FrontBG.mp4"
                        autoPlay
                        muted
                        loop
                        playsInline
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/60" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-950/30 to-slate-950" />

                    {/* Hero Content Overlay */}
                    <div className="relative z-20 max-w-7xl mx-auto px-6 text-center flex flex-col items-center gap-8 py-16">
                        {/* Status Badge */}
                        <m.div
                            variants={fadeInUp}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 backdrop-blur-xl text-emerald-400 text-xs sm:text-sm font-semibold tracking-widest uppercase shadow-lg shadow-emerald-950/50"
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            ✦ A SINGLE-OPERATOR RENTAL DEMO ✦
                        </m.div>

                        {/* High-Impact Main Heading */}
                        <m.h1
                            variants={fadeInUp}
                            className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight text-white leading-none max-w-5xl"
                        >
                            ENGINEERED FOR <br className="hidden sm:inline" />
                            <span className="bg-gradient-to-r from-emerald-400 via-teal-200 to-cyan-400 bg-clip-text text-transparent">
                                UNCOMPROMISING
                            </span> FREEDOM.
                        </m.h1>

                        {/* Subtitle */}
                        <m.p
                            variants={fadeInUp}
                            className="text-lg sm:text-xl text-slate-300 max-w-2xl font-light leading-relaxed"
                        >
                            Browse a curated demo fleet and check rental dates.
                            Payment is simulated; no real money is transferred.
                        </m.p>

                        {/* Dynamic CTA Control Bar */}
                        <m.div
                            variants={fadeInUp}
                            className="flex flex-col sm:flex-row items-center gap-4 mt-4 w-full sm:w-auto"
                        >
                            <Link
                                href="/auth/customer/login/"
                                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 font-bold text-lg shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
                            >
                                <span>Explore Demo Fleet</span>
                                <span className="text-xl">→</span>
                            </Link>
                            <Link
                                href="/auth/admin/login/"
                                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-lg border border-white/20 backdrop-blur-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <span>Operator Login</span>
                            </Link>
                        </m.div>

                        <p className="mt-10 text-slate-300">Portfolio demo. Demo payment — no money will be transferred.</p>
                    </div>
                </m.section>

                {/* WHY RIDERS TRUST US */}
                <m.section
                    className="py-12 px-6 max-w-7xl mx-auto w-full"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ amount: 0.2, once: true }}
                    variants={stagger}
                >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <m.div className="lg:col-span-5 flex flex-col gap-6" variants={fadeInUp}>
                            <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">Rental essentials</span>
                            <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
                                Why Riders Choose <br />
                                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Orbit Rides</span>
                            </h2>
                            <p className="text-slate-300 text-lg leading-relaxed font-light">
                                Browse the published fleet and choose a rental interval.
                                Orbit Rides is a single-operator rental demonstration with simulated payments.
                            </p>
                        </m.div>

                        <m.div className="lg:col-span-7 flex flex-col gap-4" variants={stagger}>
                            <WhyChooseUsItem
                                Icon={FaTags}
                                title="Published daily prices"
                                description="See each vehicle’s daily price before requesting a rental quote."
                            />
                            <WhyChooseUsItem
                                Icon={FaCarSide}
                                title="Vehicle details"
                                description="View available vehicle photographs and details from the operator’s catalogue."
                            />
                            <WhyChooseUsItem
                                Icon={FaHeadset}
                                title="A fixed pickup location"
                                description="Check the operator’s pickup details before requesting your rental."
                            />
                        </m.div>
                    </div>
                </m.section>

                {/* FEATURED FLEET CAROUSEL */}
                <section className="py-12 px-6 max-w-7xl mx-auto w-full">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-4">
                        <div>
                            <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">Curated Showcase</span>
                            <h2 className="text-3xl sm:text-5xl font-bold text-white mt-1">Featured Fleet</h2>
                        </div>
                        <Link href="/auth/customer/login/" className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold flex items-center gap-2 group">
                            <span>Browse All Vehicles</span>
                            <span className="transition-transform group-hover:translate-x-1">→</span>
                        </Link>
                    </div>
                    {fleetError ? <p role="alert">The fleet could not be loaded. Please refresh to retry.</p> : featuredCars.length ? <HomePageFeaturedCarsCarousel cars={featuredCars} /> : <p>No vehicles are published yet.</p>}
                </section>

                {/* HOW IT WORKS */}
                <m.section
                    className="py-16 px-6 max-w-7xl mx-auto w-full"
                    variants={stagger}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl">
                        <div className="text-center max-w-2xl mx-auto mb-12">
                            <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">Seamless Process</span>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">How Orbit Rides Works</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { step: "01", title: "Select Vehicle", desc: "Browse published vehicles and their daily prices." },
                                { step: "02", title: "Check Availability", desc: "Choose pickup and return times to check eligible inventory." },
                                { step: "03", title: "Demo Rental", desc: "Demo checkout simulates payment without transferring money." }
                            ].map((item, idx) => (
                                <m.div key={idx} variants={fadeInUp} className="flex flex-col gap-4 p-6 rounded-2xl bg-white/5 border border-white/5">
                                    <span className="text-4xl font-extrabold text-emerald-400/80">{item.step}</span>
                                    <h3 className="text-xl font-bold text-white">{item.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                                </m.div>
                            ))}
                        </div>
                    </div>
                </m.section>

                {/* FINAL CALL TO ACTION */}
                <m.section
                    className="pb-24 px-6 max-w-5xl mx-auto text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.5 }}
                    variants={stagger}
                >
                    <m.div variants={fadeInFromBottom} className="p-12 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl flex flex-col items-center gap-6">
                        <h2 className="text-4xl sm:text-6xl font-extrabold text-white">
                            Ready for the Ultimate Drive?
                        </h2>
                        <p className="text-slate-300 text-lg max-w-xl font-light">
                            Browse vehicles and check dates in this single-operator rental demo.
                        </p>
                        <Link
                            href="/auth/customer/login/"
                            className="px-10 py-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-lg shadow-xl shadow-emerald-500/30 hover:scale-105 transition-all"
                        >
                            Browse Vehicles
                        </Link>
                    </m.div>
                </m.section>
            </main>

            <Footer />
        </div>
    );
}

function WhyChooseUsItem({ Icon, title, description }: {
    Icon: IconType,
    title: string,
    description: string
}) {
    return (
        <m.div
            className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl flex items-start gap-5 hover:border-emerald-500/40 transition-all duration-300 hover:translate-x-1"
            variants={fadeInRight}
        >
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-2xl border border-emerald-500/20 shrink-0">
                <Icon />
            </div>
            <div className="flex flex-col gap-1">
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed font-light">{description}</p>
            </div>
        </m.div>
    );
}
