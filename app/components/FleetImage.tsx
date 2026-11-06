'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function FleetImage({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
    const [failedSource, setFailedSource] = useState<string | null>(null)
    if (!src || failedSource === src) return <div className={`flex items-center justify-center bg-base-200 text-base-content/70 min-h-36 p-4 text-center ${className}`} role="img" aria-label={`${alt}: photo unavailable`}>Vehicle photo unavailable</div>
    return <div className={`relative min-h-36 ${className}`}><Image src={src} alt={alt} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" onError={() => setFailedSource(src)} /></div>
}
