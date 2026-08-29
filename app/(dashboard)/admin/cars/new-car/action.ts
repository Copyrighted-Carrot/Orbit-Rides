'use server'
import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";
import {Car} from "@/lib/types/models";

export async function addNewCar(newCarData: Car)
{
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();

    if (!user) return { error: { message: "Authentication required to add a vehicle." } };

    const manufacturer = String(newCarData.manufacturer || '').trim();
    const model = String(newCarData.model || '').trim();
    const carName = `${manufacturer} ${model}`.trim() || 'Vehicle';

    const formattedCar: Record<string, unknown> = {
        owner_id: user.id,
        name: carName,
        manufacturer: manufacturer,
        model: model,
        type_id: Number(newCarData.type_id || 1),
        price_per_day: Number(newCarData.price_per_day || 0),
        fuel: Number(newCarData.fuel || 1),
        seats: Number(newCarData.seats || 5),
        color: String(newCarData.color || '#FFFFFF').trim(),
    };

    let data = null;
    let error = null;

    // Retry loop: auto-detect and strip any missing columns reported by PostgREST schema cache errors
    for (let attempt = 0; attempt < 5; attempt++) {
        const result = await supabase
            .from("cars")
            .insert(formattedCar as unknown as Parameters<ReturnType<typeof supabase.from>['insert']>[0])
            .select();

        data = result.data;
        error = result.error;

        if (!error) break;

        const match = error.message?.match(/Could not find the '([^']+)' column/i) || error.message?.match(/'([^']+)' column/i);
        if (match && match[1] && match[1] in formattedCar) {
            delete formattedCar[match[1]];
        } else if (error.message?.includes('schema cache')) {
            if ('color' in formattedCar) delete formattedCar.color;
            else if ('fuel' in formattedCar) delete formattedCar.fuel;
            else break;
        } else {
            break;
        }
    }

    if (!error && data && data.length > 0) {
        redirect(`/admin/cars/new-car/upload_images/${data[0].id}/`);
    }

    return error ? {error} : {success: true};
}
