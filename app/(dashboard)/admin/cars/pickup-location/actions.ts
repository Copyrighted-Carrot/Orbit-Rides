'use server'
import { revalidatePath } from 'next/cache'
import { adminClient, type FleetFormState } from '@/lib/fleet/admin'
import { textField } from '@/lib/auth/form'

export async function updatePickupLocation(_state: FleetFormState, form: FormData): Promise<FleetFormState> {
    const client = await adminClient()
    const name = textField(form, 'name').trim(), city = textField(form, 'city').trim()
    const address = textField(form, 'address').replace(/[\r\n\t]+/g, ' ').trim()
    if (!name || name.length > 120 || !city || city.length > 120 || !address || address.length > 500 || /[\u0000-\u001f]/.test(name + city + address)) {
        return { error: 'Enter a pickup name, city and address within the displayed limits.' }
    }
    const { error } = await client.rpc('configure_pickup_location', { p_name: name, p_city: city, p_address: address })
    if (error) return { error: 'Pickup details could not be saved. Please retry.' }
    revalidatePath('/admin/cars/pickup-location')
    revalidatePath('/customer/cars', 'layout')
    return { success: true, message: 'Pickup details saved. Existing quotes and rental history retain their original location.' }
}
