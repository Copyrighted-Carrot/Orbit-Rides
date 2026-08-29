import NavBar from "@/app/components/NavBar";
import Footer from "@/app/components/Footer";
import React from "react";

export default function CustomerDashboardLayout({children}: { children: React.ReactNode })
{
    return (
        <>
            <NavBar role='customer'/>
            <section className='grow'>{children}</section>
            <Footer/>
        </>
    )
}