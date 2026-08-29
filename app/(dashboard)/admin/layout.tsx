import NavBar from "@/app/components/NavBar";
import Footer from "@/app/components/Footer";
import React from "react";

export default function AdminDashboardLayout({children}: { children: React.ReactNode })
{
    return (
        <>
            <NavBar role='admin'/>
            <section className='grow'>{children}</section>
            <Footer/>
        </>
    )
}