'use client'
import React, { useState } from 'react';
import { 
    FaBell, FaCheckDouble 
} from 'react-icons/fa6';
import { timeAgo } from '@/lib/util/util';

interface NotificationItem {
    id: number;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    link?: string;
}

interface NotificationCenterProps {
    notifications?: NotificationItem[];
}

export default function NotificationCenter({ notifications: initialNotifications = [] }: NotificationCenterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const handleMarkAsRead = async (id: number) => {
        // Here you would call a server action
        setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const handleMarkAllRead = async () => {
        // Here you would call a server action
        setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className="btn btn-ghost btn-circle btn-sm relative text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10"
                title="Notifications"
            >
                <FaBell className="w-4 h-4" />
                {unreadCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute top-1 right-1 animate-pulse border border-slate-950" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-12 z-[1200] w-80 sm:w-96 bg-slate-950 border border-white/10 rounded-3xl shadow-2xl p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                            <FaBell className="text-emerald-400" />
                            <h4 className="font-extrabold text-white text-sm">Notifications</h4>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                                    {unreadCount} New
                                </span>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-[11px] text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                            >
                                <FaCheckDouble /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-400">
                                You&apos;re all caught up! 🎉
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`p-3 rounded-2xl border flex flex-col gap-2 transition-all ${
                                        !n.is_read
                                            ? 'bg-slate-900/90 border-emerald-500/30'
                                            : 'bg-white/5 border-white/5 opacity-70'
                                    }`}
                                >
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                                {n.title}
                                            </span>
                                            <span className="text-[10px] text-slate-500">{timeAgo(n.created_at)}</span>
                                        </div>
                                        <p className="text-xs text-slate-300 font-light leading-relaxed">
                                            {n.message}
                                        </p>
                                    </div>
                                    {!n.is_read && (
                                        <div className="flex justify-end mt-1">
                                            <button 
                                                onClick={() => handleMarkAsRead(n.id)}
                                                className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300"
                                            >
                                                Mark as read
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
