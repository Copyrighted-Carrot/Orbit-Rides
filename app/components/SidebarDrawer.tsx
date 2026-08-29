'use client'
import LogoLink from "@/app/components/LogoLink";
import {usePathname} from "next/navigation";
import NavBarItems from "@/app/components/NavBarItems";

export default function SidebarDrawer()
{
    const role = usePathname().split('/')[1];

    return (
        <div className="drawer-side z-[1150]">
            <label htmlFor="my-drawer-3" aria-label="close sidebar" className="drawer-overlay"></label>
            <ul className="menu bg-base-200 min-h-full w-80 p-4 text-center">
                {/* Sidebar content here */}
                <LogoLink href={'/' + role} className='my-4'/>
                {/* @ts-ignore */}
                <NavBarItems isSideBarItems={true} role={role}/>
            </ul>
        </div>
    );
}