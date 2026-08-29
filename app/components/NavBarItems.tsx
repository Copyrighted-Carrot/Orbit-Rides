'use client'
import Link from "next/link";
import {ReactNode} from "react";
import {FaCalendar, FaCar, FaCoins, FaGear} from "react-icons/fa6";

export default function NavBarItems({role, isSideBarItems = false}: {
    role: 'admin' | 'customer' | '',
    isSideBarItems?: boolean
})
{
    switch (role)
    {
        case 'admin':
            return <AdminNavBarItems isSideBarItems={isSideBarItems}/>
        case 'customer':
            return <CustomerNavBarItems isSideBarItems={isSideBarItems}/>
        default:
            return <HomePageNavBarItems isSideBarItems={isSideBarItems}/>
    }
}

function AdminNavBarItems({isSideBarItems}: { isSideBarItems: boolean })
{
    return (
        <>
            <li><NavBarLink href={'/admin/bookings'} isSideBarItem={isSideBarItems}>
                {isSideBarItems && <FaCalendar/>}
                Bookings</NavBarLink></li>
            
            <li><NavBarLink href={'/admin/cars'} isSideBarItem={isSideBarItems}>
                {isSideBarItems && <FaCar/>}
                Cars</NavBarLink></li>
        </>
    );
}

function CustomerNavBarItems({isSideBarItems}: { isSideBarItems: boolean })
{
    return (
        <>
            <li><NavBarLink href={'/customer/bookings'} isSideBarItem={isSideBarItems}>
                {isSideBarItems && <FaCalendar/>}
                Bookings</NavBarLink></li>
        </>
    );
}

function HomePageNavBarItems({isSideBarItems}: { isSideBarItems: boolean })
{
    return (
        <>
            <li><NavBarLink href={'/customer'} isSideBarItem={isSideBarItems}>
                {isSideBarItems && <FaCoins/>}
                Rent</NavBarLink></li>
            <li>
                <NavBarLink href={'/admin'} isSideBarItem={isSideBarItems}>
                    {isSideBarItems && <FaGear/>}
                    Management</NavBarLink>
            </li>
        </>
    );
}

/**
 * A custom next.js Link component that closes the sidebar drawer when it gets clicked.
 * @param href Target link.
 * @param isSideBarItem Close the drawer if true, else don't close.
 * @param children Content children.
 * @constructor
 */
function NavBarLink({href, isSideBarItem, children}: { href: string, isSideBarItem: boolean, children: ReactNode })
{
    return <Link href={href}
                 onClick={() =>
                 {
                     if (isSideBarItem) document.getElementById('my-drawer-3')?.click()
                 }}
                 className='menu'
    >
        {children}
    </Link>
}