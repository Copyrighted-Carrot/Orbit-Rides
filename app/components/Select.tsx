import React from "react";
import ReactSelect, {Props as SelectProps} from 'react-select';
import clsx from "clsx";

const controlStyles = {
    base: "bg-none hover:cursor-pointer select !select-bordered relative !transition-[border] !duration-[100ms] !ease-[cubic-bezier(.4,0,.2,1)]",
    focus: "",
    nonFocus: "",
};

const optionStyles = {
    base: "hover:cursor-pointer px-3 py-2 rounded-lg",
    focus: "bg-primary text-primary-content active:bg-gray-400",
};

function Select(props: SelectProps)
{
    return (
        <ReactSelect {...props}
                     unstyled
                     styles={{
                         control: (baseStyles: object, state: { isFocused: boolean; }) => ({
                             ...baseStyles,
                             borderWidth: '1px',
                             borderColor: !state.isFocused ? 'var(--fallback-bc, oklch(var(--bc) / .2))' : 'oklch(var(--p))',
                             transition: 'none'
                         }),
                     }}
                     classNames={{
                         control: ({isFocused}: { isFocused: boolean }) =>
                             clsx(
                                 isFocused ? controlStyles.focus : controlStyles.nonFocus,
                                 controlStyles.base,
                             ),
                         placeholder: () => 'text-gray-500 pl-1 py-0.5',
                         dropdownIndicator: () => 'p-1 absolute',
                         menu: () => 'menu bg-base-200 rounded-lg min-w-24 shadow-md',
                         option: ({isFocused}: { isFocused: boolean }) =>
                             clsx(
                                 isFocused && optionStyles.focus,
                                 optionStyles.base,
                             ),
                     }}
        />
    );
}

export default Select;