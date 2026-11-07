'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import FleetImage from './FleetImage'
import { createClient } from '@/lib/supabase/client'
import { prepareInspectionUpload, attachInspectionUpload, discardInspectionUpload, type InspectionMediaResult } from '@/app/(dashboard)/admin/bookings/inspection-media-actions'

type Media = { id: string; inspection_id: string; state: string; url: string | null }
export default function InspectionMedia({ userId, inspections, media }: { userId: string; inspections: { id: string; kind: string }[]; media: Media[] }) {
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState<InspectionMediaResult>({})
    async function upload(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const form = event.currentTarget, data = new FormData(form), file = data.get('photo')
        if (!(file instanceof File) || !file.size || file.size > 8388608 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setResult({ error: 'Choose a JPEG, PNG or WebP image up to 8 MiB.' }); return }
        setBusy(true); setResult({})
        try {
            const prepared = await prepareInspectionUpload(userId, { inspectionId: String(data.get('inspection')), contentType: file.type, byteLength: file.size })
            if (!prepared.media) { setResult({ error: prepared.error }); return }
            const uploaded = await createClient().storage.from('rental-inspections').upload(prepared.media.object_path, file, { upsert: false, contentType: file.type })
            if (uploaded.error) {
                const cleanup = await discardInspectionUpload(userId, prepared.media.id)
                setResult({ error: cleanup.success ? 'Upload failed. Its unfinished association was removed; please retry.' : `Upload failed. ${cleanup.error}` }); return
            }
            const attached = await attachInspectionUpload(userId, prepared.media.id)
            setResult(attached)
            if (attached.success) form.reset()
        } catch { setResult({ error: 'The upload was interrupted. Reload to retry validation or clean up the unfinished upload.' }) }
        finally { setBusy(false); router.refresh() }
    }
    async function recover(id: string, cleanup: boolean) {
        setBusy(true); setResult({})
        try { setResult(await (cleanup ? discardInspectionUpload(userId, id) : attachInspectionUpload(userId, id))) }
        catch { setResult({ error: 'The request was interrupted. Reload the saved state before retrying.' }) }
        finally { setBusy(false); router.refresh() }
    }
    return <section aria-label="Inspection photos" className="space-y-4">
        <h2 className="text-xl font-semibold">Private inspection photos</h2>
        <p>Optional staff evidence. Attached photos stay with the inspection and cannot be replaced through the fleet gallery.</p>
        {!!inspections.length && <form onSubmit={upload} aria-label="Add inspection photo">
            <fieldset disabled={busy} className="flex flex-wrap items-end gap-3">
                <label className="form-control gap-1">Inspection<select className="select select-bordered" name="inspection">{inspections.map(item => <option key={item.id} value={item.id}>{item.kind === 'pickup' ? 'Pickup' : 'Return'}</option>)}</select></label>
                <label className="form-control gap-1">Photo<input className="file-input file-input-bordered" type="file" name="photo" accept="image/jpeg,image/png,image/webp" required /></label>
                <button className="btn btn-outline" type="submit">Upload inspection photo</button>
            </fieldset>
            <p className="text-sm mt-2">Still JPEG, PNG or WebP, up to 8 MiB, 10,000 pixels per side and 20 million pixels total.</p>
        </form>}
        {busy && <p role="status">Saving inspection photo…</p>}{result.error && <p role="alert">{result.error}</p>}{result.message && <p role="status">{result.message}</p>}
        {!media.length && <p>No inspection photos on this page.</p>}
        <div className="grid sm:grid-cols-2 gap-4">{media.map(item => <article key={item.id} className="border rounded-lg p-3 space-y-2">
            <FleetImage src={item.url} alt={`${inspections.find(record => record.id === item.inspection_id)?.kind || 'Inspection'} inspection evidence`} className="h-48" />
            <p>{inspections.find(record => record.id === item.inspection_id)?.kind} photo · {item.state}</p>
            {item.state === 'attached' && !item.url && <p>Photo preview could not be loaded. Reload to request a fresh preview.</p>}
            {item.state === 'pending' && <button disabled={busy} className="btn btn-sm btn-outline" onClick={() => void recover(item.id, false)}>Retry photo validation</button>}
            {['pending', 'discarded'].includes(item.state) && <button disabled={busy} className="btn btn-sm btn-outline" onClick={() => void recover(item.id, true)}>Clean up unfinished photo</button>}
        </article>)}</div>
    </section>
}
