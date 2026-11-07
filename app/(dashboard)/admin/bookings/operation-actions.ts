'use server'
import { revalidatePath } from 'next/cache'
import { requireAccount } from '@/lib/auth/account'
import { textField } from '@/lib/auth/form'
import { validVehicleId } from '@/lib/fleet/search'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/clean.types'

export type OperationResult = { error?: string; bookingId?: string }
export async function operateBooking(_state: OperationResult, form: FormData): Promise<OperationResult> {
    const { user } = await requireAccount('admin')
    if (textField(form, 'user_id') !== user.id) return { error: 'Your account changed. Reload before continuing.' }
    const id = textField(form, 'booking_id'), command = textField(form, 'command')
    if (!validVehicleId(id)) return { error: 'Invalid booking reference.' }
    const client = await createClient<Database>()
    let result: { error: { code?: string } | null }
    if (command === 'ready') result = await client.rpc('mark_ready', { p_booking_id: id })
    else if (command === 'inspect') result = await client.rpc('start_inspection', { p_booking_id: id })
    else if (command === 'complete') result = await client.rpc('complete_booking', { p_booking_id: id })
    else if (command === 'pickup' || command === 'return') {
        const condition = textField(form, 'condition').trim(), damage = textField(form, 'damage').trim(), notes = textField(form, 'notes').trim()
        const rawFuel = textField(form, 'fuel'), rawMileage = textField(form, 'mileage'), fuel = Number(rawFuel), mileage = Number(rawMileage)
        if (!condition || condition.length > 500 || damage.length > 2000 || notes.length > 2000 || !/^\d{1,3}$/.test(rawFuel) || fuel > 100 || !/^\d{1,10}$/.test(rawMileage) || mileage > 2147483647) return { error: 'Provide condition, fuel/charge 0–100 and valid mileage. Notes and damage descriptions may contain up to 2,000 characters.' }
        result = await client.rpc(command === 'pickup' ? 'pick_up' : 'return_vehicle', { p_booking_id: id, p_condition: condition, p_fuel_percent: fuel, p_odometer_km: mileage, p_damage: damage, p_staff_notes: notes })
    } else if (command === 'fail' || command === 'clear') {
        const reason = textField(form, 'reason').trim()
        if (!reason || reason.length > 500) return { error: 'Provide a staff inspection reason of up to 500 characters.' }
        result = await client.rpc('finish_inspection', { p_booking_id: id, p_passed: command === 'clear', p_reason: reason })
    } else return { error: 'Unknown operational command.' }
    if (result.error) return { error: 'This action could not be recorded. Reload the saved state and check the current stage, pickup time, mileage and any pending cancellation. Retrying identical details is safe.' }
    for (const path of ['/admin/bookings', '/admin/cars', '/customer/bookings', '/customer/notifications', '/customer/profile', '/customer/cars']) revalidatePath(path, 'layout')
    revalidatePath(`/admin/bookings/${id}`)
    revalidatePath(`/customer/bookings/${id}`)
    return { bookingId: id }
}
