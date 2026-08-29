import React from 'react';

interface ColorOption
{
    value: string;
    label: string;
}

const colorOptions: ColorOption[] = [
    {value: '#FFFFFF', label: 'White'},
    {value: '#000000', label: 'Black'},
    {value: '#9a9a9a', label: 'Silver'},
    {value: '#FF0000', label: 'Red'},
    {value: '#FFA500', label: 'Orange'},
    {value: '#0026ff', label: 'Blue'},
    {value: '#5e7b83', label: 'Slate'},
    {value: '#FFFF00', label: 'Yellow'},
    {value: '#5cb97c', label: 'Green'},
];

export default function ColorSelect({ defaultValue }: { defaultValue?: string })
{
    return (
        <fieldset
            className='flex flex-wrap gap-2'
            id="color">
            {colorOptions.map((color, index) =>
                <ColorRadioBtn defaultChecked={defaultValue ? color.value.toLowerCase() === defaultValue.toLowerCase() : index === 0} color={color} key={index}/>)}
        </fieldset>
    );
}

function ColorRadioBtn({color, defaultChecked}: { color: ColorOption, defaultChecked?: boolean })
{
    return (
        <label
            className='border-on-check drop-shadow btn btn-md lg:btn-sm btn-square'
            style={{backgroundColor: color.value}}
            title={color.label}
        >
            <input
                type="radio"
                value={color.value}
                name="color"
                style={{display: 'none'}}
                defaultChecked={defaultChecked}
            />
        </label>
    );
}