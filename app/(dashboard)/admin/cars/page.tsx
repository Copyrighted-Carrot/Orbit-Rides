import {createClient} from "@/lib/supabase/server";
import Link from "next/link";
import {Car} from "@/lib/types/models";
import CarCard from "@/app/(dashboard)/admin/cars/CarCard";
import * as m from "framer-motion/m";
import {FaPlus} from "react-icons/fa6";

export const metadata = {
    title: 'Manage Cars | Orbit Rides - Admin',
    description: 'View, edit, and add cars to your inventory within the Orbit Rides admin panel.',
};

export default async function AdminCarsPage()
{
    const supabase = await createClient();
    const {data: carsData, error: carsError} = await supabase.schema('public')
        .from('cars')
        .select('*')
        .order('price_per_day', {ascending: false})

    const {data: typesData, error: typesError} = await supabase
        .schema('public')
        .from("car_types")
        .select();

    if (carsError) throw new Error(carsError.message);
    if (typesError) throw new Error(typesError.message);

    const carTypes = typesData.map((carType) => ({
        value: carType.id,
        label: carType.type
    }));

    let cars: Car[] = carsData as Car[];

    // Order the cars with no images first.
    cars = cars.sort((a, b) =>
    {
        if (a.img_urls === null && b.img_urls !== null) return -1;
        if (a.img_urls !== null && b.img_urls === null) return 1;
        return 0; // Preserve price sorting for other cases
    });

    // Populate the type_display for each car.
    cars.forEach(car =>
    {
        const carType = carTypes.find(type => type.value === car.type_id);
        if (carType) car.type_display = carType.label;
    });

    if (!cars || cars.length <= 0) return (
        <div className='flex flex-col justify-center items-center gap-4 h-full min-h-96 py-8'>
            <h2 className='text-lg font-semibold'>You don&#39;t have any cars yet</h2>
            <Link href={'/admin/cars/new-car/'} className='btn btn-primary text-lg'>Add a Car</Link>
        </div>
    )

    return (
        <div className='flex flex-col gap-8 py-10 px-4 md:px-8 lg:px-14 relative'>

            {/* Title */}
            <m.h2 className='font-bold bg-gradient-to-br text-3xl lg:text-4xl z-10 
                lg:absolute top-12 lg:left-14
                from-emerald-600 via-emerald-700 to-emerald-900 bg-clip-text text-transparent'
                  initial={{x: -30, opacity: 0}}
                  animate={{x: 0, opacity: 1}}
                  transition={{duration: 0.6}}>
                My Cars
            </m.h2>

            <Link className='btn btn-neutral btn-square z-20 text-lg shadow-xl
                             fixed lg:sticky bottom-8 lg:top-20 lg:ml-auto
                             right-4 md:right-8 lg:right-14'
                  href={'/admin/cars/new-car/'}
                  title={'Add a new car to the system.'}>
                <FaPlus className='text-primary'/>
            </Link>

            <section
                className='grow relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 
                           gap-8 md:gap-6 justify-center items-center'>
                {
                    cars.map((car, index) =>
                        <CarCard key={index} props={{...car}}/>)
                }
            </section>
        </div>
    );
}
