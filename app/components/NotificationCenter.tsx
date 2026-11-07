import Link from 'next/link'
import { FaBell } from 'react-icons/fa6'

export default function NotificationCenter() {
    return <Link href="/customer/notifications" aria-label="Notifications" className="btn btn-ghost btn-circle btn-sm"><FaBell className="w-4 h-4" /></Link>
}
