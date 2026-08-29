import BookingStep1PageContent from "@/app/(dashboard)/customer/booking/step1/BookingStep1PageContent";
import {use} from "react";
import {redirect} from "next/navigation";
import {Car} from "@/lib/types/models";

export const metadata = {
    title: 'Book Now: Step 1 - Details | Orbit Rides',
    description: 'Review your car selection, pickup date and time, and your delivery location.',
};

type SearchParamsType = {
    searchParams: Promise<{
        car: string,
        rentDate: string,
        deliveryLocation: string
    }>
}

export default function BookingStep1({searchParams}: SearchParamsType)
{
    const {car: carJSON, rentDate: rentDateJSON, deliveryLocation: deliveryLocationJSON} = use(searchParams)
    if (!carJSON || !rentDateJSON || !deliveryLocationJSON) redirect('/customer/');

    const car = JSON.parse(decodeURIComponent(carJSON)) as Car;
    const rentDate = JSON.parse(rentDateJSON)
    const deliveryLocation = JSON.parse(deliveryLocationJSON)
    
    return <BookingStep1PageContent car={car} rentDate={rentDate} deliveryLocation={deliveryLocation}/>
}