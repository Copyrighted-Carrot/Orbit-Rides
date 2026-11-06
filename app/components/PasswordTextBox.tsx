'use client'

import { useState } from 'react'
import { FaEye, FaEyeSlash } from 'react-icons/fa6'

interface PasswordTextBoxProps {
    id: string
    label: string
    placeholder: string
    defaultValue?: string
    autoComplete?: 'current-password' | 'new-password'
}

export default function PasswordTextBox({ id, label, placeholder, defaultValue = '', autoComplete = 'current-password' }: PasswordTextBoxProps) {
    const [visible, setVisible] = useState(false)
    return <div className="flex flex-col gap-1 relative">
        <label htmlFor={id}>{label}</label>
        <div className="relative">
            <input required className="input input-bordered w-full pr-12" defaultValue={defaultValue}
                type={visible ? 'text' : 'password'} autoComplete={autoComplete} id={id} name={id} placeholder={placeholder} />
            <button onClick={() => setVisible(value => !value)} type="button"
                aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}
                className="absolute right-4 top-1/2 -translate-y-1/2">
                {visible ? <FaEyeSlash /> : <FaEye />}
            </button>
        </div>
    </div>
}
