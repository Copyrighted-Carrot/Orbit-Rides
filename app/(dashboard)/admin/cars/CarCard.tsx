'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { archiveVehicle, setVehiclePublication } from './actions'
import type { FleetVehicle, FleetFormState } from '@/lib/fleet/admin'

export default function CarCard({ vehicle, typeName }: { vehicle: FleetVehicle; typeName: string }) {
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState<FleetFormState>({})
    const [confirmArchive, setConfirmArchive] = useState(false)
    const archived = vehicle.operational_state === 'archived'
    async function command(kind: 'publication' | 'archive') {
        setBusy(true)
        setResult({})
        try {
            const next = kind === 'archive' ? await archiveVehicle(vehicle.id) : await setVehiclePublication(vehicle.id, !vehicle.published)
            setResult(next)
            if (next.success) { setConfirmArchive(false); router.refresh() }
        } catch { setResult({ error: 'The request could not be completed. Refresh the fleet to check its current state before retrying.' }) }
        finally { setBusy(false) }
    }
    return <article className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body gap-3">
            <p className="text-sm">{vehicle.fleet_code} · {typeName}</p>
            <h2 className="card-title">{vehicle.manufacturer} {vehicle.model}</h2>
            <p>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(vehicle.daily_rate_minor / 100)} / day</p>
            <p><span className="badge badge-outline mr-2">{vehicle.published ? 'Published' : archived ? 'Archived' : 'Draft'}</span>Operational condition: {vehicle.operational_state}</p>
            <div className="flex flex-wrap gap-2">
                <Link className="btn btn-sm btn-outline" href={`/admin/cars/edit/${vehicle.id}`}>{archived ? 'View details' : 'Edit details'}</Link>
                <Link className="btn btn-sm btn-outline" href={`/admin/cars/new-car/upload_images/${vehicle.id}`}>Gallery</Link>
                {!archived && <button className="btn btn-sm btn-primary" type="button" disabled={busy} onClick={() => void command('publication')}>{vehicle.published ? 'Unpublish' : 'Publish'}</button>}
                {!archived && !confirmArchive && <button className="btn btn-sm btn-ghost" type="button" disabled={busy} onClick={() => setConfirmArchive(true)}>Archive</button>}
            </div>
            {confirmArchive && <div className="border rounded p-3 space-y-2">
                <p>Archive {vehicle.fleet_code}? It will leave new discovery. Historical rentals and media are retained; this screen cannot undo archival.</p>
                <div className="flex gap-2"><button className="btn btn-sm btn-warning" type="button" disabled={busy} onClick={() => void command('archive')}>Confirm archive</button><button className="btn btn-sm" type="button" disabled={busy} onClick={() => setConfirmArchive(false)}>Keep vehicle</button></div>
            </div>}
            {busy && <p role="status">Saving fleet change…</p>}
            {result.error && <p role="alert">{result.error}</p>}
            {result.message && <p role="status">{result.message}</p>}
        </div>
    </article>
}
