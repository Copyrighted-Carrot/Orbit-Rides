import type { Json } from '@/lib/supabase/clean.types'

export default function PickupLocation({ snapshot }: { snapshot: Json | null }) {
    const city = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) && typeof snapshot.city === 'string' ? snapshot.city : null
    return <div><p>Pickup location: {city || 'Not recorded on this earlier demo quote'}</p><p className="text-sm">Demo pickup location</p></div>
}
