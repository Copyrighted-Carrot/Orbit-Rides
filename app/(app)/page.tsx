import Link from "next/link";
import NavBar from "@/app/components/NavBar";
import Footer from "@/app/components/Footer";
import Image from 'next/image';
import * as m from "framer-motion/m"
import user1 from '@/public/images/testimonials/user (1).jpg';
import user2 from '@/public/images/testimonials/user (2).jpg';
import user3 from '@/public/images/testimonials/user (3).jpg';
import carOwnersBg from '@/public/images/car-owners.jpg';
import HomePageFeaturedCarsCarousel from "@/app/(app)/HomePageFeaturedCarsCarousel";
import { Car } from "@/lib/types/models";
import { createClient } from "@/lib/supabase/server";
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
    const supabase = await createClient();
    const { data: carsData, error } = await supabase
        .from('cars')
        .select('*')
        .not('img_urls', 'is', null)
        .gte('price_per_day', 60)
        .order('price_per_day', { ascending: false });

    if (error) throw new Error(error.message);
    const featuredCars: Car[] = carsData as Car[];

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
                        src="/videos/FrontBG.mp4"
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
                            ✦ THE APEX OF LUXURY MOBILITY ✦
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
                            Experience ultra-premium vehicles delivered on demand. Unmatched elegance, 
                            instant booking, and seamless luxury for those who accept nothing less.
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
                                <span>Explore Luxury Fleet</span>
                                <span className="text-xl">→</span>
                            </Link>
                            <Link
                                href="/auth/admin/login/"
                                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-lg border border-white/20 backdrop-blur-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <span>List Your Vehicle</span>
                            </Link>
                        </m.div>

                        {/* Floating Quick Stats Bar */}
                        <m.div
                            variants={fadeInUp}
                            className="grid grid-cols-3 gap-4 sm:gap-8 mt-12 p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-2xl w-full max-w-3xl shadow-2xl"
                        >
                            <div className="flex flex-col items-center">
                                <span className="text-2xl sm:text-4xl font-extrabold text-white">6,000+</span>
                                <span className="text-xs sm:text-sm text-slate-400 font-medium">Happy Renters</span>
                            </div>
                            <div className="flex flex-col items-center border-x border-white/10 px-4">
                                <span className="text-2xl sm:text-4xl font-extrabold text-emerald-400">1,000+</span>
                                <span className="text-xs sm:text-sm text-slate-400 font-medium">Luxury Supercars</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-2xl sm:text-4xl font-extrabold text-cyan-400">99.8%</span>
                                <span className="text-xs sm:text-sm text-slate-400 font-medium">5-Star Satisfaction</span>
                            </div>
                        </m.div>
                    </div>
                </m.section>

                {/* ACHIEVEMENTS METRICS SECTION */}
                <section className="px-6 max-w-7xl mx-auto w-full">
                    <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-slate-900/80 to-slate-950 border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none" />
                        
                        <div className="text-center max-w-2xl mx-auto mb-12">
                            <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">Performance Metrics</span>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">Trusted Nationwide Since 2026</h2>
                        </div>

                        <m.div
                            className="grid grid-cols-1 md:grid-cols-3 gap-8"
                            variants={stagger}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ amount: 0.3, once: true }}
                        >
                            <m.div variants={fadeInUp} className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col gap-2 hover:border-emerald-500/40 transition-colors">
                                <span className="text-4xl sm:text-5xl font-extrabold text-emerald-400">6,500+</span>
                                <span className="text-lg font-semibold text-white">Active Members</span>
                                <span className="text-sm text-slate-400">Verified drivers enjoying premium rentals across all major states.</span>
                            </m.div>

                            <m.div variants={fadeInUp} className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col gap-2 hover:border-emerald-500/40 transition-colors">
                                <span className="text-4xl sm:text-5xl font-extrabold text-teal-300">1,200+</span>
                                <span className="text-lg font-semibold text-white">Curated Supercars</span>
                                <span className="text-sm text-slate-400">From BMW M-Series and Porsche to Tesla Plaid & Range Rover.</span>
                            </m.div>

                            <m.div variants={fadeInUp} className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col gap-2 hover:border-emerald-500/40 transition-colors">
                                <span className="text-4xl sm:text-5xl font-extrabold text-cyan-400">12,000+</span>
                                <span className="text-lg font-semibold text-white">Completed Journeys</span>
                                <span className="text-sm text-slate-400">Over 10M miles driven with 24/7 roadside assistance.</span>
                            </m.div>
                        </m.div>
                    </div>
                </section>

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
                            <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">Unrivaled Excellence</span>
                            <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
                                Why Riders Choose <br />
                                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Orbit Rides</span>
                            </h2>
                            <p className="text-slate-300 text-lg leading-relaxed font-light">
                                We don’t just offer rental cars — we engineer unforgettable driving experiences. 
                                Seamless digital keys, white-glove delivery, and 24/7 VIP support come standard with every reservation.
                            </p>
                        </m.div>

                        <m.div className="lg:col-span-7 flex flex-col gap-4" variants={stagger}>
                            <WhyChooseUsItem
                                Icon={FaTags}
                                title="Luxury Within Reach"
                                description="Transparent all-inclusive rates with zero hidden fees. Experience exotic performance at competitive daily pricing."
                            />
                            <WhyChooseUsItem
                                Icon={FaCarSide}
                                title="100-Point Inspected Vehicles"
                                description="Every vehicle undergoes rigorous multi-point mechanical inspections and detailing before every handover."
                            />
                            <WhyChooseUsItem
                                Icon={FaHeadset}
                                title="24/7 Dedicated Concierge"
                                description="Real-time support, doorstep key dropoff, and instant roadside assistance wherever your journey leads."
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
                    <HomePageFeaturedCarsCarousel cars={featuredCars} />
                </section>

                {/* EARN WITH YOUR CAR (ADMIN / OWNER FLEET) */}
                <section className="px-6 max-w-7xl mx-auto w-full">
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-slate-900/90 shadow-2xl">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                            <div className="relative h-80 lg:h-[480px] w-full overflow-hidden">
                                <Image
                                    src={carOwnersBg}
                                    fill
                                    alt="Luxury Car Owners"
                                    className="object-cover filter brightness-90 transition-transform duration-700 hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-900/40 to-slate-900 lg:bg-gradient-to-r lg:from-transparent lg:to-slate-900" />
                            </div>

                            <div className="p-8 sm:p-12 flex flex-col gap-6">
                                <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">Fleet Monetization</span>
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                                    Turn Your Supercar Into a <br className="hidden sm:inline" />
                                    <span className="text-emerald-400">High-Yield Asset</span>
                                </h2>
                                <p className="text-slate-300 text-base sm:text-lg leading-relaxed font-light">
                                    Join our host network to earn residual income on your luxury vehicles. 
                                    We manage insurance verification, host payouts, and customer identity screening automatically.
                                </p>
                                <div>
                                    <Link
                                        href="/auth/admin/login/"
                                        className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-base hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
                                    >
                                        <span>Start Earning Today</span>
                                        <span>→</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* TESTIMONIALS SECTION */}
                <m.section
                    className="py-12 px-6 max-w-7xl mx-auto w-full"
                    variants={stagger}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">Renter Feedback</span>
                        <h2 className="text-3xl sm:text-5xl font-bold text-white mt-2">What Our Clients Say</h2>
                    </div>

                    <m.div className="grid grid-cols-1 md:grid-cols-3 gap-8" variants={stagger}>
                        {[
                            {
                                name: "Jane Doe",
                                role: "Verified Renter",
                                feedback: "The BMW M4 Competition was delivered straight to my hotel. Flawless condition, frictionless check-in!",
                                image: user1,
                            },
                            {
                                name: "John Smith",
                                role: "Executive Member",
                                feedback: "Orbit Rides is on another level. Customer service responded in 30 seconds when I extended my trip.",
                                image: user2,
                            },
                            {
                                name: "Christopher Kaiser",
                                role: "Verified Renter",
                                feedback: "Best exotic rental platform I've used. Clean billing, gorgeous vehicles, and complete peace of mind.",
                                image: user3,
                            },
                        ].map(({ name, role, feedback, image }, index) => (
                            <m.div
                                key={index}
                                className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl flex flex-col gap-6 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1"
                                variants={fadeInFromBottom}
                            >
                                <div className="flex items-center gap-1 text-emerald-400 text-sm">
                                    {"★".repeat(5)}
                                </div>
                                <p className="text-slate-300 text-base leading-relaxed italic font-light">
                                    &ldquo;{feedback}&rdquo;
                                </p>
                                <div className="flex items-center gap-4 mt-auto pt-4 border-t border-white/5">
                                    <Image
                                        src={image}
                                        height={50}
                                        width={50}
                                        alt={name}
                                        className="rounded-full w-12 h-12 border-2 border-emerald-500/40 object-cover"
                                    />
                                    <div>
                                        <h3 className="text-white font-bold text-base">{name}</h3>
                                        <p className="text-slate-400 text-xs">{role}</p>
                                    </div>
                                </div>
                            </m.div>
                        ))}
                    </m.div>
                </m.section>

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
                                { step: "01", title: "Select Vehicle", desc: "Browse our handpicked fleet of luxury supercars and SUVs." },
                                { step: "02", title: "Instant Booking", desc: "Reserve your dates with transparent pricing & zero hidden fees." },
                                { step: "03", title: "Key Handover", desc: "Pick up your car or have it delivered directly to your doorstep." }
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
                            Your next journey deserves perfection. Unlock instant reservations for your dream car now.
                        </p>
                        <Link
                            href="/auth/customer/login/"
                            className="px-10 py-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-lg shadow-xl shadow-emerald-500/30 hover:scale-105 transition-all"
                        >
                            Reserve Your Vehicle
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
