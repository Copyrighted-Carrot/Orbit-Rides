'use client'
import ReactSelect, {Props as SelectProps} from "react-select";
import clsx from "clsx";
import {useEffect, useState, useMemo} from "react";
import {rentTimes} from "@/lib/types/rentTimes";

export default function TimePicker({id, pickupDate}: { id: string; pickupDate?: string })
{
    // Filter out past times if the pickup date is today
    const availableTimes = useMemo(() => {
        if (!pickupDate) return rentTimes;
        
        const pickup = new Date(pickupDate);
        const now = new Date();
        
        // Check if the pickup date is today
        const isToday = pickup.getFullYear() === now.getFullYear() 
            && pickup.getMonth() === now.getMonth() 
            && pickup.getDate() === now.getDate();
        
        if (!isToday) return rentTimes;
        
        // Filter: only show times that are at least 1 hour from now
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const bufferMinutes = 60; // 1 hour buffer
        
        return rentTimes.filter(time => {
            // Parse time label like "02:30 PM" to minutes from midnight
            const match = time.label.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return true;
            
            let hours = parseInt(match[1]);
            const mins = parseInt(match[2]);
            const period = match[3].toUpperCase();
            
            if (period === 'AM' && hours === 12) hours = 0;
            if (period === 'PM' && hours !== 12) hours += 12;
            
            const timeMinutes = hours * 60 + mins;
            return timeMinutes > currentMinutes + bufferMinutes;
        });
    }, [pickupDate]);

    // Default to first available time
    const defaultTime = availableTimes.length > 0 ? availableTimes[0] : rentTimes[0];

    return (
        <Select
            id={id}
            name={id}
            defaultValue={defaultTime}
            menuPlacement='top'
            required
            options={availableTimes}
            noOptionsMessage={() => 'No available times today'}
        />
    );
}

const controlStyles = {
    base: "bg-none hover:cursor-pointer select lg:select-sm relative bg-transparent !text-base !pl-0 !pr-5" +
        " font-bold !min-h-0 lg:!py-0 !transition-[border,padding] !duration-[100ms] !ease-[cubic-bezier(.4,0,.2,1)]",
    focus: "!pl-4 !pr-9",
    nonFocus: "",
};

const optionStyles = {
    base: "hover:cursor-pointer px-3 py-2 rounded-lg text-base-content",
    focus: "bg-primary text-primary-content active:bg-gray-400",
};


function Select(props: SelectProps)
{
    // 'document' can't be accessed in SSR, so we have to wait until the component get mounted on client.
    const [_document, set_document] = useState<Document | null>(null)

    useEffect(() =>
    {
        set_document(document)
    }, [])

    if (_document === null) return null;

    return (
        <ReactSelect {...props}
                     menuPortalTarget={_document.body}
                     unstyled
                     styles={{
                         control: (baseStyles: object, state: { isFocused: boolean; }) => ({
                             ...baseStyles,
                             borderWidth: '1px',
                             borderColor: !state.isFocused ? 'transparent' : 'oklch(var(--p))',
                             transition: 'none'
                         }),
                     }}
                     classNames={{
                         container: () => 'time-picker-container',
                         control: ({isFocused}: { isFocused: boolean }) =>
                             clsx(
                                 isFocused ? controlStyles.focus : controlStyles.nonFocus,
                                 controlStyles.base,
                             ),
                         placeholder: () => 'text-gray-500 pl-1 py-0.5',
                         dropdownIndicator: () => 'p-1 absolute',
                         menu: () => 'menu bg-base-200 rounded-lg min-w-24 max-h-60 shadow-lg !z-[9999]',
                         option: ({isFocused}: { isFocused: boolean }) =>
                             clsx(
                                 isFocused && optionStyles.focus,
                                 optionStyles.base,
                             ),
                     }}
        />
    );
}