'use client'
import {useTheme} from "next-themes";
import {useEffect, useState} from "react";
import React from "react";
import ReactSelect from 'react-select';
import clsx from "clsx";
import {PaletteIcon} from "@/app/icons";

export function ThemeSwitcher({className = ''}: { className?: string })
{
    const [mounted, setMounted] = useState(false)
    const {theme, setTheme} = useTheme()

    // useEffect only runs on the client, so now we can safely show the UI
    useEffect(() =>
    {
        setMounted(true)
    }, [])

    if (!mounted) return <div className='mr-1 sm:mr-2 md:mr-4 dark:bg-opacity-50 skeleton h-7 w-7 rounded-lg'></div>

    return (
        <Select
            aria-label="Select color theme"
            value={options.find((option) => option.value === theme) ?? options[0]}
            onChange={(selectedOption: unknown) => {
                const opt = selectedOption as { value: string };
                if (opt?.value) setTheme(opt.value);
            }}
            className={className}
            isSearchable={false}
            options={options}
            components={{SingleValue: SingleValue}}/>
    )
}

// Custom SingleValue component to show the icon instead of text
const SingleValue = () =>
{
    return (
        <PaletteIcon width='1.6rem' height='1.6rem' className='!relative !top-0.5 !left-0.5'/>
    );
};

const options = [
    {value: 'system', label: 'System'},
    {value: 'dark', label: 'Dark'},
    {value: 'light', label: 'Light'},
];


const controlStyles = {
    base: "!min-h-4 !min-w-4 hover:cursor-pointer relative btn btn-square btn-sm btn-ghost mr-1 sm:mr-2 md:mr-4",
    focus: "",
    nonFocus: "",
};

const optionStyles = {
    base: "hover:cursor-pointer px-3 py-2 rounded-lg text-base-content",
    focus: "bg-primary text-primary-content active:bg-gray-400",
};

type SelectProperties = React.ComponentProps<typeof ReactSelect> & {
    className?: string;
    'aria-label'?: string;
};

function Select(props: SelectProperties)
{
    return (
        <ReactSelect {...props}
                     unstyled
                     classNames={{
                         control: ({isFocused}: { isFocused: boolean }) =>
                             clsx(
                                 isFocused ? controlStyles.focus : controlStyles.nonFocus,
                                 controlStyles.base,
                             ) + ' ' + props.className,
                         placeholder: () => 'text-gray-500 pl-1 py-0.5',
                         dropdownIndicator: () => '!hidden',
                         valueContainer: () => '!overflow-visible !contents',
                         menu: () => 'menu bg-base-200 rounded-lg min-w-24 !right-0 shadow-md',
                         option: ({isFocused}: { isFocused: boolean }) =>
                             clsx(
                                 isFocused && optionStyles.focus,
                                 optionStyles.base,
                             ),
                     }}
        />
    );
}