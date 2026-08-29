import localFont from "next/font/local";
import "./globals.css";
import React from "react";
import {ThemeProvider} from "next-themes";
import ToastContainer from "@/app/ToastContainer";
import { LazyMotion, domAnimation } from "framer-motion"
import SidebarDrawer from "@/app/components/SidebarDrawer";

const geistSans = localFont({
    src: "./fonts/GeistVF.woff",
    variable: "--font-geist-sans",
    weight: "100 900",
});

export const metadata = {
    applicationName: 'Orbit Rides',
    description: "Find your perfect car rental with Orbit Rides for your next adventure. Browse our vast selection of vehicles, from economy to luxury, and enjoy a seamless booking experience.",
    authors: [{ name: 'Belindo Samson S.' }],
    creator: 'Belindo Samson S.',
    publisher: 'Belindo Samson S.',
    keywords: [
        "car rentals",
        "luxury car rentals",
        "Orbit Rides",
        "car booking",
        "premium car rentals",
        "vehicle rentals",
        "affordable car hire",
        "rental cars near me",
        "high-end car rentals",
        "car rental service",
        "best car rental deals",
        "daily car rentals",
        "weekend car rentals",
        "long-term car rentals",
        "exclusive car rentals",
        "rent a car",
        "book a car online",
    ],
    
    openGraph: {
        title: "Orbit Rides",
        description: "Find your perfect car rental with Orbit Rides for your next adventure. Browse our vast selection of vehicles, from economy to luxury, and enjoy a seamless booking experience.",
        url: "https://orbit-rides.vercel.app",
        siteName: 'Orbit Rides',
        type: "website",
        images: [
            {
                url: "https://orbit-rides.vercel.app/images/social-media-image.jpg",
                alt: "Orbit Rides Social Media Image",
            },
        ],
    },
    
    twitter: {
        card: "summary_large_image",
        title: "Orbit Rides",
        description: "Find your perfect car rental with Orbit Rides for your next adventure. Browse our vast selection of vehicles, from economy to luxury, and enjoy a seamless booking experience.",
        images: ["https://orbit-rides.vercel.app/images/social-media-image.jpg"],
    },

    robots: {
        index: true,
        follow: true,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://orbit-rides.vercel.app'),
};

import { WishlistProvider } from "@/app/components/WishlistContext";
import WishlistDrawer from "@/app/components/WishlistDrawer";
import CommandPalette from "@/app/components/CommandPalette";

export default function RootLayout({children,}: Readonly<{ children: React.ReactNode; }>)
{
    return (
        <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} antialiased 
        bg-gradient-to-r from-slate-50 to-gray-300
        dark:bg-none dark:bg-base-300`}>
        <ThemeProvider storageKey='orbit_rides_theme'>
            <WishlistProvider>
                <div className="drawer">
                    <input id="my-drawer-3" type="checkbox" className="drawer-toggle"/>
                    <div className="drawer-content flex flex-col">
                        {/* Page content here */}
                        <LazyMotion strict features={domAnimation}>
                            <div className='flex flex-col min-h-screen'>{children}</div>
                        </LazyMotion>
                        <ToastContainer/>
                        <WishlistDrawer />
                        <CommandPalette />
                    </div>
                    <SidebarDrawer/>
                </div>
            </WishlistProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}