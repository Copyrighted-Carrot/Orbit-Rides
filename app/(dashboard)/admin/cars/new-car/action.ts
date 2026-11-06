'use server'

import { saveVehicle } from '../actions'

export async function addNewCar(form: FormData) {
    return saveVehicle(null, form)
}
