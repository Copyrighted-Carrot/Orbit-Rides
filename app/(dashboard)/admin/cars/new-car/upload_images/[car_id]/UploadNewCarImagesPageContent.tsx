'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FleetImage from '@/app/components/FleetImage'
import { createClient } from '@/lib/supabase/client'
import { prepareGalleryUpload, publishGalleryMedia, retireGalleryMedia, discardGalleryUpload } from '../../../actions'
import type { FleetVehicle, GalleryMedia, FleetFormState } from '@/lib/fleet/admin'

type Gallery = { media: GalleryMedia[]; total: number; page: number; pages: number; state: string }
export default function UploadNewCarImagesPageContent({ vehicle, gallery }: { vehicle: FleetVehicle; gallery: Gallery }) {
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState<FleetFormState>({})
    const [progress, setProgress] = useState('')
    const archived = vehicle.operational_state === 'archived'
    const base = `/admin/cars/new-car/upload_images/${vehicle.id}`
    async function upload(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form), file = data.get('image')
        if (!(file instanceof File) || !file.size || file.size > 8388608 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setResult({ error: 'Choose a JPEG, PNG or WebP image up to 8 MiB.' }); return
        }
        setBusy(true); setResult({}); setProgress('Preparing upload…')
        let mediaId: string | undefined
        try {
            const prepared = await prepareGalleryUpload({ vehicleId: vehicle.id, category: String(data.get('category')), position: Number(data.get('position')), contentType: file.type, byteLength: file.size })
            if (!prepared.media) { setResult({ error: prepared.error }); return }
            mediaId = prepared.media.id
            setProgress('Uploading image…')
            const { error } = await createClient().storage.from('fleet-gallery').upload(prepared.media.object_path, file, { upsert: false, contentType: file.type })
            if (error) {
                const cleanup = await discardGalleryUpload(mediaId)
                setResult({ error: cleanup.success ? 'Upload failed. The unfinished upload was removed; please retry.' : 'Upload failed. ' + cleanup.error })
                return
            }
            setProgress('Validating image content and publishing…')
            const published = await publishGalleryMedia(mediaId)
            setResult(published)
            if (published.success) form.reset()
        } catch {
            setResult({ error: mediaId ? 'The request was interrupted. Refresh the gallery and retry validation or cleanup for the unfinished upload.' : 'The upload request was interrupted. Refresh the gallery to check unfinished uploads before trying again.' })
        } finally { setBusy(false); setProgress(''); router.refresh() }
    }
    async function mediaCommand(id: string, operation: 'publish' | 'retire' | 'discard') {
        setBusy(true); setResult({})
        try { setResult(await (operation === 'publish' ? publishGalleryMedia(id) : operation === 'retire' ? retireGalleryMedia(id) : discardGalleryUpload(id))); router.refresh() }
        catch { setResult({ error: 'The request was interrupted. Refresh the gallery to check its current state before retrying.' }) }
        finally { setBusy(false) }
    }
    return <div className="max-w-6xl mx-auto w-full py-10 px-4 md:px-8 space-y-6">
        <Link className="link" href="/admin/cars">Back to fleet and publication controls</Link>
        <h1 className="text-3xl font-bold">Gallery: {vehicle.manufacturer} {vehicle.model}</h1>
        <p>{vehicle.fleet_code} · {vehicle.published ? 'Published' : archived ? 'Archived' : 'Draft'}. Each category and position is one gallery slot. Replacing a slot retains the previous image for recovery.</p>
        {!archived && <form onSubmit={upload} className="border rounded-lg p-5 space-y-4">
            <fieldset disabled={busy} className="grid md:grid-cols-3 gap-4">
                <label className="form-control gap-1">Category<select name="category" className="select select-bordered" defaultValue="exterior">{['exterior', 'interior', 'cockpit', 'rear', 'detail'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
                <label className="form-control gap-1">Position<input className="input input-bordered" type="number" name="position" min="0" max="31" step="1" defaultValue="0" required /></label>
                <label className="form-control gap-1">Image<input className="file-input file-input-bordered" type="file" name="image" accept="image/jpeg,image/png,image/webp" required /></label>
                <button className="btn btn-primary" type="submit">Upload and publish image</button>
            </fieldset><p className="text-sm">Still JPEG, PNG or WebP; up to 8 MiB, 10,000 pixels per side and 20 million pixels total.</p>
        </form>}
        {busy && <p role="status">{progress || 'Updating gallery…'}</p>}
        {result.error && <p role="alert" className="text-error">{result.error}</p>}
        {result.message && <p role="status">{result.message}</p>}
        <form action={base} method="get" className="flex gap-3 items-end"><label className="form-control gap-1">Gallery state<select className="select select-bordered" name="state" defaultValue={gallery.state}>{['all', 'current', 'pending', 'retired', 'discarded'].map(state => <option key={state} value={state}>{state}</option>)}</select></label><button className="btn" type="submit">Filter gallery</button></form>
        <p>{gallery.total} gallery records</p>
        {!gallery.media.length && <p role="status">No images in this gallery view.</p>}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{gallery.media.map(item => <article key={item.id} className="border rounded-lg p-4 space-y-3">
            <FleetImage src={item.url} alt={`${vehicle.manufacturer} ${vehicle.model} ${item.category}`} className="h-40" />
            <p className="font-semibold">{item.category} · position {item.position} · {item.state}</p>
            <div className="flex flex-wrap gap-2">
                {!archived && ['pending', 'retired'].includes(item.state) && <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => void mediaCommand(item.id, 'publish')}>{item.state === 'retired' ? 'Restore image' : 'Validate and publish'}</button>}
                {item.state === 'current' && <button className="btn btn-sm btn-outline" disabled={busy} onClick={() => void mediaCommand(item.id, 'retire')}>Remove from gallery</button>}
                {['pending', 'discarded'].includes(item.state) && <button className="btn btn-sm btn-outline" disabled={busy} onClick={() => void mediaCommand(item.id, 'discard')}>Clean up unfinished upload</button>}
            </div>
        </article>)}</div>
        <nav aria-label="Gallery pages" className="flex gap-4 items-center">{gallery.page > 1 && <Link className="btn" href={`${base}?state=${gallery.state}&page=${gallery.page - 1}`}>Previous</Link>}<span>Page {gallery.page} of {gallery.pages}</span>{gallery.page < gallery.pages && <Link className="btn" href={`${base}?state=${gallery.state}&page=${gallery.page + 1}`}>Next</Link>}</nav>
    </div>
}
