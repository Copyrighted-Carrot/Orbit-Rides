'use client'
import {ThemeSwitcher} from "@/app/components/ThemeSwitcher";
import UserProfile from "@/app/components/UserProfile";
import LogoLink from "@/app/components/LogoLink";
import NavBarItems from "@/app/components/NavBarItems";
import { useWishlist } from "@/app/components/WishlistContext";
import NotificationCenter from "@/app/components/NotificationCenter";
import { FaHeart } from "react-icons/fa6";

export default function NavBar({position = "sticky", role = ''}: {
    position?: 'sticky' | 'fixed',
    role?: 'admin' | 'customer' | '',
})
{
    const { wishlist, setIsDrawerOpen } = useWishlist();

    return (
        <div className={`top-3 px-3 z-[1100] w-full ${position}`}>
            <div
                className="navbar backdrop-blur bg-white dark:bg-black text-base-content 
                 bg-opacity-50 dark:bg-opacity-50 rounded-lg mx-auto px-4 py-0 min-h-14 shadow">

                {/* Sidebar button on mobile */}
                <div className="flex-none lg:hidden">
                    <label htmlFor="my-drawer-3" aria-label="open sidebar" className="btn btn-square btn-sm btn-ghost">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            className="inline-block h-6 w-6 stroke-current">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </label>
                </div>

                <div className="navbar-start">
                    <LogoLink href={`/${role}`} className="btn btn-ghost btn-sm" size='sm'/>
                </div>

                <div className="navbar-center hidden lg:flex">
                    <div className="hidden flex-none lg:block">
                        <ul className="menu menu-horizontal">
                            <NavBarItems role={role}/>
                        </ul>
                    </div>
                </div>

                <div className="navbar-end gap-2">
                    <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="btn btn-ghost btn-circle btn-sm relative text-emerald-400 hover:bg-emerald-500/10"
                        title="View Wishlist"
                    >
                        <FaHeart className="w-4 h-4" />
                        {wishlist.length > 0 && (
                            <span className="badge badge-emerald badge-xs absolute -top-1 -right-1 font-bold">
                                {wishlist.length}
                            </span>
                        )}
                    </button>
                    <NotificationCenter />
                    <ThemeSwitcher/>
                    <UserProfile/>
                </div>
            </div>
        </div>
    );
}