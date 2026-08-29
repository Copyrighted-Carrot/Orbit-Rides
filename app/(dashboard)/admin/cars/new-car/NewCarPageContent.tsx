'use client';
import TextBox from '@/app/components/TextBox';
import React, {FormEvent, ReactNode, useEffect, useState} from "react";
import {addNewCar} from '@/app/(dashboard)/admin/cars/new-car/action';
import {toast} from 'react-toastify';
import {FormSubmitButton} from "@/app/components/FormSubmitButton";
import Select from '@/app/components/Select';
import {createClient} from "@/lib/supabase/client";
import NewCarPageSkeleton from "@/app/(dashboard)/admin/cars/new-car/skeleton";
import ColorSelect from "@/app/components/ColorSelect";
import {fuelTypes} from "@/lib/types/fuelTypes";
import {Car} from "@/lib/types/models";
import {FaPlus} from "react-icons/fa6";

export default function NewCarPageContent()
{
    const [isPending, setIsPending] = useState(false)
    const [carTypes, setCarTypes] = useState<CarType[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient();

    useEffect(() =>
    {
        const fetchTypes = async () =>
        {
            const {data, error} = await supabase
                .schema('public')
                .from("car_types")
                .select();

            if (error) throw new Error(error.message);
            else
                setCarTypes(data.map((carType) => ({
                    value: carType.id.toString(),
                    label: carType.type
                })));

            setIsLoading(false);
        };

        fetchTypes();
    }, [supabase])

    async function handleSubmit(e: FormEvent<HTMLFormElement>)
    {
        e.preventDefault();
        setIsPending(true);

        const formData = new FormData(e.currentTarget);
        const newCarData = Object.fromEntries(formData) as unknown as Car;
        const result = await addNewCar(newCarData);

        if (result.error)
            toast.error(result.error.message);
        else
            toast.success("Car added successfully.");

        setIsPending(false);
    }

    if (isLoading) return <NewCarPageSkeleton/>

    return (
        <div className='flex flex-col justify-center items-center py-10 px-4 md:px-8 lg:px-14'>
            <form onSubmit={handleSubmit} className='flex flex-col gap-4 w-full max-w-xl'>

                <ul className="steps">
                    <li className="step step-primary">Details</li>
                    <li className="step">Images</li>
                    <li className="step">Done!</li>
                </ul>

                {/* Title */}
                <h2 className='font-bold bg-gradient-to-br text-3xl lg:text-4xl 
                from-emerald-600 via-emerald-700 to-emerald-900 bg-clip-text text-transparent'>
                    New Car
                </h2>

                <TextBox label="Manufacturer" type="manufacturer" id="manufacturer" placeholder="Brand"
                        />
                <TextBox label="Model" type="model" id="model" placeholder="Car Name"/>

                <Container>
                    <label htmlFor='type_id'>Type</label>
                    <Select
                        name='type_id'
                        defaultValue={carTypes[0]}
                        isSearchable={false}
                        required
                        options={carTypes}
                    />
                </Container>

                <Container>
                    <label htmlFor='price_per_day'>Per Diem</label>
                    <span className='relative'>
                    <span className='absolute top-3 left-4 select-none pointer-events-none'>₹</span>
                    <input id='price_per_day' name="price_per_day" type="number" step="100"
                           className='input input-bordered indent-3 w-full'
                           defaultValue={1500}/>
                </span>
                </Container>

                <Container>
                    <label>Fuel</label>
                    <Select
                        name='fuel'
                        defaultValue={fuelTypes[0]}
                        isSearchable={false}
                        required
                        options={fuelTypes}/>
                </Container>

                <Container>
                    <label htmlFor='seats'>Seats</label>
                    <input name="seats" id='seats' type="number" min="1" max="24" step="1"
                           className='input input-bordered'
                           defaultValue={5}/>
                </Container>

                <Container>
                    <label>Color</label>
                    <ColorSelect/>
                </Container>

                <FormSubmitButton text='Add Car' isPending={isPending} icon={<FaPlus/>}/>
            </form>
        </div>
    );
}

function Container({children}: { children: ReactNode })
{
    return (
        <div className='flex flex-col gap-1'>
            {children}
        </div>
    );
}

interface CarType
{
    value: string;
    label: string;
}