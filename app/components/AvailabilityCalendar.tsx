'use client'
import React, { useState } from 'react';
import { 
    FaCalendarCheck, 
    FaChevronLeft, 
    FaChevronRight, 
    FaCircle, 
    FaClock 
} from 'react-icons/fa6';

export default function AvailabilityCalendar({ bookedDates = [] }: { bookedDates?: string[] }) {
    const today = new Date();
    const [currentMonthIndex, setCurrentMonthIndex] = useState(0);

    const getMonthData = (offset: number) => {
        const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
        const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const startDay = d.getDay();
        return { monthName, daysInMonth, startDay, year: d.getFullYear(), month: d.getMonth() };
    };

    const months = [getMonthData(0), getMonthData(1)];
    const currentMonthData = months[currentMonthIndex];
    
    const augDays = Array.from({ length: currentMonthData.daysInMonth }, (_, i) => i + 1);

    const [selectedDate, setSelectedDate] = useState<number | null>(null);

    const isBooked = (day: number) => {
        const dStr = `${currentMonthData.year}-${String(currentMonthData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return bookedDates.includes(dStr);
    };

    return (
        <div className="p-8 rounded-3xl bg-slate-950 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
                <div>
                    <span className="text-xs uppercase font-semibold tracking-widest text-emerald-400">Real-Time Schedule</span>
                    <h3 className="text-2xl font-extrabold text-white mt-1 flex items-center gap-2">
                        <FaCalendarCheck className="text-emerald-400" />
                        <span>Premium Availability Calendar</span>
                    </h3>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300">
                        <FaCircle className="text-emerald-400 text-[10px]" />
                        <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                        <FaCircle className="text-red-500 text-[10px]" />
                        <span>Booked</span>
                    </div>
                </div>
            </div>

            {/* Calendar Controls */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setCurrentMonthIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentMonthIndex === 0}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-colors"
                >
                    <FaChevronLeft />
                </button>
                <span className="text-lg font-bold text-white tracking-tight">{currentMonthData.monthName}</span>
                <button
                    onClick={() => setCurrentMonthIndex((prev) => Math.min(months.length - 1, prev + 1))}
                    disabled={currentMonthIndex === months.length - 1}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-colors"
                >
                    <FaChevronRight />
                </button>
            </div>

            {/* Day Names Header */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 text-sm font-semibold">
                {Array.from({ length: currentMonthData.startDay }, (_, i) => (
                    <div key={`empty-${i}`} className="h-12 rounded-xl bg-transparent" />
                ))}

                {augDays.map((day) => {
                    const booked = isBooked(day);
                    const isSelected = selectedDate === day;

                    return (
                        <button
                            key={day}
                            disabled={booked}
                            onClick={() => setSelectedDate(day)}
                            className={`h-12 rounded-2xl flex flex-col items-center justify-center relative transition-all border ${
                                booked
                                    ? 'bg-slate-900/40 text-slate-600 border-white/5 cursor-not-allowed line-through'
                                    : isSelected
                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-lg shadow-emerald-500/20 scale-105'
                                    : 'bg-white/5 text-slate-200 border-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/30'
                            }`}
                        >
                            <span>{day}</span>
                        </button>
                    );
                })}
            </div>

            {/* Selected Date Summary */}
            {selectedDate && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                        <FaClock className="text-emerald-400 text-sm" />
                        <span>Selected Pickup Date: <strong>{currentMonthData.monthName.split(' ')[0]} {selectedDate}, {currentMonthData.year}</strong></span>
                    </div>
                    <span className="text-emerald-400 font-bold">100% Instant Confirmation</span>
                </div>
            )}
        </div>
    );
}
