'use client'
import {CalendarIcon, CheckmarkCircle} from "@/app/icons";
import DatePicker from "@/app/components/DatePicker";
import TimePicker from "@/app/components/TimePicker";
import {toast} from "react-toastify";
import {FormEvent, useState} from "react";
import dynamic from "next/dynamic";
import {useRouter} from "next/navigation";
import {MoonLoader} from "react-spinners";

const Map = dynamic(() => import('@/app/components/Map'), {
    ssr: false,
    loading: () => <p className='font-bold'>Loading map...</p>,
});

const inputCommonStyles = 'input input-ghost font-bold lg:h-auto p-0 bg-transparent !transition-[border,text-indent]';

export default function FindCarForm()
{
    const [deliveryLocation, setDeliveryLocation] = useState({})
    const [isLoading, setIsLoading] = useState(false)
    const [pickupStartDate, setPickupStartDate] = useState<string | undefined>(undefined)
    const router = useRouter();

    async function handleSubmit(e: FormEvent<HTMLFormElement>)
    {
        e.preventDefault();

        if (isDeliveryLocationNull(deliveryLocation))
        {
            toast.error('Please select a delivery location.');
            return;
        }

        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        const data = JSON.stringify(Object.fromEntries(formData) as unknown);

        router.push(`/customer/cars/?pickupData=${data}&deliveryLocation=${JSON.stringify(deliveryLocation)}`)
    }

    return (
        <>
            <form onSubmit={handleSubmit}
                  id='search-for-car-form'
                  className="flex flex-col lg:flex-row w-full bg-white dark:bg-neutral shadow-md p-2 rounded-lg 
                             md:mt-auto my-auto md:my-0 md:mb-14 
                             md:max-w-[600px] md:mx-auto
                             lg:max-w-none lg:mx-0
                             bg-opacity-50 dark:bg-opacity-70 backdrop-blur-md">
            
              <span className="lg:h-20 flex flex-col grow justify-between lg:pl-5 p-3">
                    <label className='text-neutral-700 dark:text-neutral-400'
                           htmlFor='pickup-date'>Pick Up Date</label>
                  
                  <DatePicker name='pickup-date'
                              id='pickup-date'
                              form={'search-for-car-form'}
                              onDateRangeChange={(dates) => {
                                  if (dates[0]) setPickupStartDate(dates[0].toISOString());
                              }}
                              className={`${inputCommonStyles} relative !p-0 cursor-pointer`}/>
                </span>

                <div className="divider divider-horizontal"/>

                <span className="lg:h-20 flex flex-col grow justify-between p-3">
                    <label className='text-neutral-700 dark:text-neutral-400 text-nowrap'
                           htmlFor='pickup-location'>Pickup Location</label>
                
                    <button type='button'
                            onClick={() => (document.getElementById('location-pick-modal') as HTMLDialogElement).showModal()}
                            className='btn btn-ghost lg:!min-h-7 lg:!h-7 font-bold !text-base !p-0 justify-start transition-[transform] !text-left inline-flex center-on-focus text-nowrap'>
                        {isDeliveryLocationNull(deliveryLocation)
                            ? <span>Pick Location</span>
                            : <span className='inline-flex justify-center items-center gap-1'>
                                <CheckmarkCircle className='inline-block text-success dark:text-primary'
                                                 width={'1.4rem'}/> Location Set
                            </span>}
                    </button>
                </span>

                <div className="divider divider-horizontal"/>

                <span className="lg:h-20 flex flex-col lg:w-1/4 justify-between p-3">
                    <label className='text-neutral-700 dark:text-neutral-400'
                    >Pick Up Time</label>
                  <TimePicker id='pickup-time' pickupDate={pickupStartDate}/>
                </span>

                <span
                    className="lg:h-20 flex flex-col grow justify-between p-3 lg:p-0.5">
                    <button
                        disabled={isLoading}
                        className="h-full btn btn-primary flex lg:flex-col justify-center p-3 font-bold lg:text-xs relative min-w-48">
                        {isLoading ? <MoonLoader size='18px'/>
                            :
                            <>
                                <CalendarIcon width={25} height={25} className='lg:static absolute left-4'/>
                                Book Now
                            </>}
                    </button>
                </span>
            </form>

            <dialog id="location-pick-modal" className="modal">
                <div className="modal-box flex flex-col gap-3 w-11/12 max-w-5xl h-5/6">
                    <form method="dialog">
                        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                    </form>
                    <h3 className="font-bold text-lg">Where you want your car delivered?</h3>

                    <div className="w-full h-4/5 rounded-lg overflow-hidden mb-3">
                        <Map onLocationSelect={setDeliveryLocation}/>
                    </div>
                    <button className='btn btn-ghost text-primary ml-auto' type='button'
                            disabled={isDeliveryLocationNull(deliveryLocation)}
                            onClick={() => (document.getElementById('location-pick-modal') as HTMLDialogElement).close()}
                    >Done
                    </button>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </>
    );
}

function isDeliveryLocationNull(deliveryLocation: object)
{
    // This is how you check if an object is empty in JS 🤦‍♂️.
    return Object.keys(deliveryLocation).length === 0 && deliveryLocation.constructor === Object
}