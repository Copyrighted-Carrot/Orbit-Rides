'use client'
import { useEffect, useState } from 'react'
import { recordView } from '@/app/(dashboard)/customer/activity/actions'

export default function RecordVehicleView({ userId, vehicleId }: { userId: string; vehicleId: string }) {
    const [attempt, setAttempt] = useState(0), [error, setError] = useState('')
    useEffect(() => {
        let active = true
        setError('')
        recordView(userId, vehicleId).then(result => { if (active && result.error) setError(result.error) })
            .catch(() => { if (active) setError('This view could not be saved to your recent activity.') })
        return () => { active = false }
    }, [userId, vehicleId, attempt])
    return error ? <div role="alert"><p>{error}</p><button className="btn btn-outline btn-sm" onClick={() => setAttempt(value => value + 1)}>Retry saving view</button></div> : null
}
