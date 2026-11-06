'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveVehicle } from './actions'
import type { FleetVehicle, FleetType, FleetFormState } from '@/lib/fleet/admin'
import { FormSubmitButton } from '@/app/components/FormSubmitButton'

export default function VehicleForm({ vehicle, types }: { vehicle?: FleetVehicle; types: FleetType[] }) {
    const router = useRouter()
    const [result, setResult] = useState<FleetFormState>({})
    const [pending, setPending] = useState(false)
    const archived = vehicle?.operational_state === 'archived'
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setPending(true)
        setResult({})
        try {
            const saved = await saveVehicle(vehicle?.id || null, new FormData(event.currentTarget))
            setResult(saved)
            if (saved.success && saved.id) {
                if (!vehicle) router.push(`/admin/cars/new-car/upload_images/${saved.id}`)
                else router.refresh()
            }
        } catch { setResult({ error: 'The request could not be completed. Check the fleet before retrying to avoid repeating a successful request.' }) }
        finally { setPending(false) }
    }
    return <div className="py-10 px-4 md:px-8 lg:px-14 max-w-3xl mx-auto">
        <Link className="link" href="/admin/cars">Back to fleet</Link>
        <h1 className="text-3xl font-bold my-6">{vehicle ? `Edit ${vehicle.fleet_code}` : 'Add vehicle'}</h1>
        {archived && <p role="status" className="alert mb-6">This vehicle is archived. Its historical records remain available.</p>}
        <form onSubmit={submit} className="flex flex-col gap-5">
            <fieldset disabled={pending || archived} className="flex flex-col gap-5">
                <label className="form-control gap-1" htmlFor="fleet_code">Fleet code
                    <input id="fleet_code" name="fleet_code" className="input input-bordered" required minLength={2} maxLength={30} pattern="[A-Za-z0-9-]{2,30}" defaultValue={vehicle?.fleet_code} readOnly={Boolean(vehicle)} autoComplete="off" />
                </label>
                <label className="form-control gap-1" htmlFor="manufacturer">Manufacturer
                    <input id="manufacturer" name="manufacturer" className="input input-bordered" required maxLength={80} defaultValue={vehicle?.manufacturer} />
                </label>
                <label className="form-control gap-1" htmlFor="model">Model
                    <input id="model" name="model" className="input input-bordered" required maxLength={100} defaultValue={vehicle?.model} />
                </label>
                <label className="form-control gap-1" htmlFor="vehicle_type_id">Vehicle type
                    <select id="vehicle_type_id" name="vehicle_type_id" aria-label="Vehicle type" className="select select-bordered" required defaultValue={vehicle?.vehicle_type_id || ''}>
                        <option value="" disabled>Select a type</option>
                        {types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                    </select>
                </label>
                <label className="form-control gap-1" htmlFor="daily_rate">Daily rate (INR)
                    <input id="daily_rate" name="daily_rate" type="number" className="input input-bordered" required min="0.01" max="1000000" step="0.01" defaultValue={vehicle ? (vehicle.daily_rate_minor / 100).toFixed(2) : ''} />
                </label>
                {!vehicle && <p className="text-sm">New vehicles start as drafts. Add gallery images and publish when ready.</p>}
                {!types.length && <p role="alert">No vehicle types are configured. A type must exist before a vehicle can be saved.</p>}
                {types.length > 0 && <FormSubmitButton text={vehicle ? 'Save vehicle' : 'Create draft vehicle'} isPending={pending} />}
            </fieldset>
            {result.error && <p role="alert">{result.error}</p>}
            {result.message && <p role="status">{result.message}</p>}
        </form>
        {vehicle && <Link className="btn btn-outline mt-6" href={`/admin/cars/new-car/upload_images/${vehicle.id}`}>Manage gallery</Link>}
    </div>
}
