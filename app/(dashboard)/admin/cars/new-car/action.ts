'use server'
import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";
import {Car} from "@/lib/types/models";
import type { TablesInsert } from "@/database.types";

export async function addNewCar(newCarData: Car)
{
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();

    if (!user) return { error: { message: "Authentication required to add a vehicle." } };

    const manufacturer = String(newCarData.manufacturer || '').trim();
    const model = String(newCarData.model || '').trim();
    const formattedCar: TablesInsert<'cars'> = {
        owner_id: user.id,
        manufacturer: manufacturer,
        model: model,
        type_id: Number(newCarData.type_id || 1),
        price_per_day: Number(newCarData.price_per_day || 0),
        fuel: Number(newCarData.fuel || 1),
        seats: Number(newCarData.seats || 5),
        color: String(newCarData.color || '#FFFFFF').trim(),
    };

    const {data, error} = await supabase.from("cars").insert(formattedCar).select("id").single();

    if (!error && data) {
        redirect(`/admin/cars/new-car/upload_images/${data.id}/`);
    }

    return error ? {error} : {success: true};
}
