"use client";

import {Car} from "@/lib/types/models";
import Link from "next/link";
import Image from "next/image";
import {fuelTypes} from "@/lib/types/fuelTypes";
import {CarIcon, CarSeat, GasPump} from "@/app/icons";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "react-toastify";
import { archiveCar, unarchiveCar, deleteCar } from "./actions";

export default function CarCard({props}: { props: Car })
{
    const isNotCompleted = !props.img_urls || props.img_urls.length <= 0;
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleArchiveToggle = () => {
        startTransition(async () => {
            const action = props.is_archived ? unarchiveCar : archiveCar;
            const res = await action(props.id!);
            if (res.success) {
                toast.success(`Car ${props.is_archived ? 'unarchived' : 'archived'} successfully`);
                router.refresh();
            } else {
                toast.error(res.error || 'Failed to update car');
            }
        });
    };

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this car?")) {
            startTransition(async () => {
                const res = await deleteCar(props.id!);
                if (res.success) {
                    toast.success("Car deleted successfully");
                    router.refresh();
                } else {
                    toast.error(res.error || 'Failed to delete car');
                }
            });
        }
    };

    return (
        <div
            className={"card bg-base-100 rounded-box overflow-hidden w-full shadow-lg hover:shadow-xl " +
                `transition-shadow ${props.is_archived ? 'opacity-75' : ''}`}>

            <figure className="relative h-56 w-full rounded-t-lg overflow-hidden">
                {/* Color Circle */}
                <div className="absolute top-2 right-2 w-8 h-8 rounded-full border-2 border-white z-10"
                     style={{backgroundColor: props.color}}
                     title="Color of the car"
                />
                {props.is_archived && (
                    <div className="absolute top-2 left-2 z-10 badge badge-warning">Archived</div>
                )}
                {!isNotCompleted ?
                    <Image
                        fill
                        unoptimized
                        src={props.img_urls[0]}
                        alt={`${props.manufacturer} ${props.model} image`}
                        className="object-cover"
                    />
                    :
                    <ErrorMessage id={props.id!} />
                }
            </figure>

            <div className="card-body p-6 pb-7 gap-4">
                <h3 className="card-title items-end text-2xl font-bold mb-2">{props.manufacturer} {props.model}</h3>

                <IconsSection props={props}/>

                <div className="flex flex-wrap justify-between items-center mt-2 gap-4">
                    <div className="flex gap-2">
                        <Link href={`/admin/cars/edit/${props.id}`} className="btn btn-sm btn-accent text-accent-content">
                            Edit
                        </Link>
                        <button onClick={handleArchiveToggle} disabled={isPending} className="btn btn-sm btn-warning">
                            {props.is_archived ? 'Unarchive' : 'Archive'}
                        </button>
                        <button onClick={handleDelete} disabled={isPending} className="btn btn-sm btn-error">
                            Delete
                        </button>
                    </div>
                    <div className='flex flex-col items-end'>
                        <span className="text-xs font-medium text-slate-300">Price per day:</span>
                        <h3 className="font-bold text-lg text-primary">₹{props.price_per_day.toLocaleString('en-IN')}</h3>
                    </div>
                </div>
            </div>
        </div>
    );
}


function IconsSection({props}: { props: Car })
{
    return (
        <div className='flex my-4 gap-6 justify-evenly font-medium'>

            <div className="flex flex-col items-center gap-2">
                <GasPump width={'1.4em'}/>
                <span>{fuelTypes[props.fuel - 1].label}</span>
            </div>

            <div className="flex flex-col items-center gap-2">
                <CarSeat/>
                <span>{props.seats} seat{props.seats > 1 ? 's' : ''}</span>
            </div>

            <div className="flex flex-col items-center gap-2 " data-tip="Car Type">
                <CarIcon/>
                <span>{props.type_display}</span>
            </div>
        </div>
    );
}

function ErrorMessage({id}: {id: number})
{
    return (
        <div
            className="flex text-center flex-col justify-center items-center gap-4 p-4 bg-error text-error-content h-56 w-full absolute z-0"
        >
      <span>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 shrink-0 stroke-current mr-2 inline-block"
            fill="none"
            viewBox="0 0 24 24"
        >
          <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Incomplete Car Details
      </span>
            <p className="text-sm">This car is not ready to be listed for rental. Please complete all required fields.</p>
            <Link href={`/admin/cars/new-car/upload_images/${id}`} className="btn btn-outline btn-sm text-error-content">Complete Details</Link>
        </div>
    );
}
