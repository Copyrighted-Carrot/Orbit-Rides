import NewCarPageContent from "@/app/(dashboard)/admin/cars/new-car/NewCarPageContent";

export const metadata = {
    title: 'Add New Car: Details | Orbit Rides - Admin',
    description: 'Enter car details, including manufacturer, model, type, and pricing, within the Orbit Rides admin panel.',
};

export default function NewCarPage()
{
    return <NewCarPageContent/>
}