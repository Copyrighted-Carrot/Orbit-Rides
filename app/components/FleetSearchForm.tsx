'use client'

import { useState, type FormEvent } from 'react'
import { parseSearchParams, RENTAL_TIME_LABEL, type SearchFilters } from '@/lib/fleet/search'

export default function FleetSearchForm({ filters, types, action = '/customer/cars', requiredDates = false }: {
    filters?: Partial<SearchFilters>; types?: { id: string; name: string }[]; action?: string; requiredDates?: boolean
}) {
    const [error, setError] = useState<string | null>(null)
    function validate(event: FormEvent<HTMLFormElement>) {
        const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>
        const parsed = parseSearchParams(values)
        if (parsed.error) { event.preventDefault(); setError(parsed.error) }
        else setError(null)
    }
    return <form action={action} method="get" onSubmit={validate} className="rounded-lg bg-base-100 text-base-content p-5 shadow-md space-y-4">
        <p className="text-sm">All times: {RENTAL_TIME_LABEL}</p>
        <div className="grid gap-4 md:grid-cols-2">
            <label className="form-control gap-1">Pickup date and time<input aria-label="Pickup date and time" className="input input-bordered" type="datetime-local" name="pickup" defaultValue={filters?.pickup || ''} required={requiredDates} /></label>
            <label className="form-control gap-1">Return date and time<input aria-label="Return date and time" className="input input-bordered" type="datetime-local" name="dropoff" defaultValue={filters?.dropoff || ''} required={requiredDates} /></label>
            {types && <>
                <label className="form-control gap-1">Search vehicles<input className="input input-bordered" name="q" maxLength={100} defaultValue={filters?.q || ''} placeholder="Manufacturer or model" /></label>
                <label className="form-control gap-1">Vehicle type<select className="select select-bordered" name="type" defaultValue={filters?.type || ''}><option value="">All types</option>{types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
                <label className="form-control gap-1">Maximum daily price (INR)<input className="input input-bordered" type="number" name="max" min="0" max="1000000" step="0.01" defaultValue={filters?.max || ''} /></label>
            </>}
        </div>
        {error && <p role="alert" className="text-error">{error}</p>}
        <button className="btn btn-primary" type="submit">{types ? 'Apply filters' : 'Check availability'}</button>
    </form>
}
