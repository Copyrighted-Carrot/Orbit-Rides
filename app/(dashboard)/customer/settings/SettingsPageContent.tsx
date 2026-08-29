'use client';

import React, { useState, useTransition } from 'react';
import { updateProfile } from './actions';
import { toast } from 'react-toastify';
import { FaUser, FaPhone, FaIdCard, FaCalendarDays, FaFloppyDisk } from 'react-icons/fa6';
import { User } from '@supabase/supabase-js';

type UserProfile = {
    display_name?: string | null;
    phone?: string | null;
    license_number?: string | null;
    license_expiry?: string | null;
};

export default function SettingsPageContent({ user, profile }: { user: User, profile: UserProfile | null }) {
    const [isPending, startTransition] = useTransition();
    const [formData, setFormData] = useState({
        display_name: profile?.display_name || user.user_metadata?.full_name || user.user_metadata?.display_name || '',
        phone: profile?.phone || '',
        license_number: profile?.license_number || '',
        license_expiry: profile?.license_expiry ? new Date(profile.license_expiry).toISOString().split('T')[0] : '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            try {
                const res = await updateProfile(formData);
                if (res.success) {
                    toast.success('Profile updated successfully!');
                } else {
                    toast.error(res.error || 'Failed to update profile');
                }
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : 'An unexpected error occurred');
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">Account Settings</h1>
                    <p className="text-slate-400 mt-2">Manage your personal information and preferences.</p>
                </div>

                <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <FaUser className="text-emerald-400" />
                                Display Name
                            </label>
                            <input 
                                type="text"
                                name="display_name"
                                value={formData.display_name}
                                onChange={handleChange}
                                required
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <FaPhone className="text-emerald-400" />
                                Phone Number
                            </label>
                            <input 
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                placeholder="+91 98765 43210"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <FaIdCard className="text-emerald-400" />
                                    License Number
                                </label>
                                <input 
                                    type="text"
                                    name="license_number"
                                    value={formData.license_number}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                    placeholder="Enter license number"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <FaCalendarDays className="text-emerald-400" />
                                    License Expiry
                                </label>
                                <input 
                                    type="date"
                                    name="license_expiry"
                                    value={formData.license_expiry}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            <button 
                                type="submit"
                                disabled={isPending}
                                className="px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPending ? (
                                    <span className="loading loading-spinner loading-sm"></span>
                                ) : (
                                    <FaFloppyDisk />
                                )}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
