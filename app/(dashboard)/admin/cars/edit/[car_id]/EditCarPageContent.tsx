"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { updateCar } from "../../actions";
import { Car } from "@/lib/types/models";
import { fuelTypes } from "@/lib/types/fuelTypes";
import Select from "@/app/components/Select";
import ColorSelect from "@/app/components/ColorSelect";
import TextBox from "@/app/components/TextBox";


interface Props {
    car: Car;
    carTypes: { value: string; label: string }[];
}

export default function EditCarPageContent({ car, carTypes }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    
    // For Select components (react-select), we'll manage their state
    const defaultType = carTypes.find(t => t.value === car.type_id.toString()) || null;
    const [selectedType, setSelectedType] = useState<{ value: string; label: string } | null>(defaultType);
    
    const fuelOptions = fuelTypes.map(f => ({ value: f.value.toString(), label: f.label }));
    const defaultFuel = fuelOptions.find(f => f.value === car.fuel.toString()) || null;
    const [selectedFuel, setSelectedFuel] = useState<{ value: string; label: string } | null>(defaultFuel);

    const [showOptional, setShowOptional] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        const formData = new FormData(e.currentTarget);
        
        // Features array logic
        const featuresStr = formData.get("features") as string;
        let features: string[] = [];
        if (featuresStr?.trim()) {
            features = featuresStr.split(",").map(f => f.trim()).filter(f => f);
        }

        const updates: Partial<Car> = {
            manufacturer: formData.get("manufacturer") as string,
            model: formData.get("model") as string,
            type_id: parseInt(selectedType?.value || car.type_id.toString()),
            price_per_day: parseFloat(formData.get("price_per_day") as string),
            fuel: parseInt(selectedFuel?.value || car.fuel.toString()),
            seats: parseInt(formData.get("seats") as string),
            color: formData.get("color") as string,
        };

        const transmission = formData.get("transmission") as string;
        if (transmission) updates.transmission = transmission;
        
        const drivetrain = formData.get("drivetrain") as string;
        if (drivetrain) updates.drivetrain = drivetrain;
        
        const horsepower = formData.get("horsepower") as string;
        if (horsepower) updates.horsepower = parseInt(horsepower);
        
        const torque = formData.get("torque") as string;
        if (torque) updates.torque = torque;
        
        const engineType = formData.get("engine_type") as string;
        if (engineType) updates.engine_type = engineType;
        
        const zeroToSixty = formData.get("zero_to_sixty") as string;
        if (zeroToSixty) updates.zero_to_sixty = parseFloat(zeroToSixty);
        
        const topSpeed = formData.get("top_speed") as string;
        if (topSpeed) updates.top_speed = parseInt(topSpeed);
        
        const mileage = formData.get("mileage") as string;
        if (mileage) updates.mileage = parseInt(mileage);
        
        const fuelCapacity = formData.get("fuel_capacity") as string;
        if (fuelCapacity) updates.fuel_capacity = parseInt(fuelCapacity);
        
        const year = formData.get("year") as string;
        if (year) updates.year = parseInt(year);
        
        const description = formData.get("description") as string;
        if (description) updates.description = description;
        
        const luggageCapacity = formData.get("luggage_capacity") as string;
        if (luggageCapacity) updates.luggage_capacity = parseInt(luggageCapacity);
        
        if (features.length > 0) {
            updates.features = features;
        }

        startTransition(async () => {
            const res = await updateCar(car.id!, updates);
            if (res.success) {
                toast.success("Car updated successfully");
                router.push('/admin/cars');
                router.refresh();
            } else {
                toast.error(res.error || "Failed to update car");
            }
        });
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-slate-900/80 border border-white/10 rounded-xl shadow-xl backdrop-blur-md">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Edit Vehicle</h1>
                <button 
                    type="button" 
                    onClick={() => router.push('/admin/cars')}
                    className="btn btn-outline border-white/20 text-white hover:bg-white/10"
                >
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Mandatory Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TextBox id="manufacturer" label="Manufacturer" placeholder="BMW, Audi, etc." type="text" defaultValue={car.manufacturer} />
                    <TextBox id="model" label="Model" placeholder="M3, R8, etc." type="text" defaultValue={car.model} />
                    
                    <div className="flex flex-col gap-1">
                        <label>Car Type</label>
                        <Select 
                            options={carTypes} 
                            value={selectedType} 
                            onChange={(val: { value: string; label: string } | null) => setSelectedType(val)} 
                        />
                    </div>

                    <TextBox id="price_per_day" label="Price per Day (₹)" placeholder="5000" type="number" defaultValue={car.price_per_day?.toString()} />
                    
                    <div className="flex flex-col gap-1">
                        <label>Fuel Type</label>
                        <Select 
                            options={fuelOptions} 
                            value={selectedFuel} 
                            onChange={(val: { value: string; label: string } | null) => setSelectedFuel(val)} 
                        />
                    </div>

                    <TextBox id="seats" label="Seats" placeholder="4" type="number" defaultValue={car.seats?.toString()} />
                    
                    <div className="flex flex-col gap-1 md:col-span-2">
                        <label>Color</label>
                        <ColorSelect defaultValue={car.color} />
                    </div>
                </div>

                <div className="divider before:bg-white/10 after:bg-white/10"></div>

                <button 
                    type="button" 
                    onClick={() => setShowOptional(!showOptional)}
                    className="btn btn-ghost w-full text-slate-300"
                >
                    {showOptional ? 'Hide' : 'Show'} Optional Fields
                </button>

                {showOptional && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-800/50 rounded-lg border border-white/5">
                        <TextBox id="transmission" label="Transmission" placeholder="Automatic, Manual" type="text" defaultValue={car.transmission || ""} />
                        <TextBox id="drivetrain" label="Drivetrain" placeholder="AWD, RWD, FWD" type="text" defaultValue={car.drivetrain || ""} />
                        
                        <TextBox id="horsepower" label="Horsepower" placeholder="400" type="number" defaultValue={car.horsepower?.toString() || ""} />
                        <TextBox id="torque" label="Torque" placeholder="450 lb-ft" type="text" defaultValue={car.torque || ""} />
                        
                        <TextBox id="engine_type" label="Engine Type" placeholder="V8, Inline-4" type="text" defaultValue={car.engine_type || ""} />
                        <div className="flex flex-col gap-1">
                            <label htmlFor="zero_to_sixty">0-60 mph (sec)</label>
                            <input id="zero_to_sixty" name="zero_to_sixty" type="number" step="0.1" defaultValue={car.zero_to_sixty?.toString() || ""} className="input input-bordered" placeholder="3.5" />
                        </div>
                        
                        <TextBox id="top_speed" label="Top Speed (mph)" placeholder="155" type="number" defaultValue={car.top_speed?.toString() || ""} />
                        <TextBox id="mileage" label="Mileage (mpg/kmpl)" placeholder="20" type="number" defaultValue={car.mileage?.toString() || ""} />
                        
                        <TextBox id="fuel_capacity" label="Fuel Capacity (L/gal)" placeholder="60" type="number" defaultValue={car.fuel_capacity?.toString() || ""} />
                        <TextBox id="year" label="Year" placeholder="2023" type="number" defaultValue={car.year?.toString() || ""} />
                        
                        <TextBox id="luggage_capacity" label="Luggage Capacity (L)" placeholder="400" type="number" defaultValue={car.luggage_capacity?.toString() || ""} />
                        
                        <div className="md:col-span-2 flex flex-col gap-1">
                            <label htmlFor="features">Features (comma separated)</label>
                            <input 
                                id="features"
                                name="features"
                                type="text" 
                                className="input input-bordered w-full" 
                                defaultValue={car.features?.join(", ") || ""} 
                                placeholder="Leather seats, Sunroof, Navigation..."
                            />
                        </div>

                        <div className="md:col-span-2 flex flex-col gap-1">
                            <label htmlFor="description">Description</label>
                            <textarea 
                                id="description"
                                name="description"
                                className="textarea textarea-bordered w-full" 
                                defaultValue={car.description || ""}
                                rows={4}
                            ></textarea>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <button type="submit" disabled={isPending} className="btn btn-primary w-full md:w-auto">
                        {isPending ? <span className="loading loading-spinner"></span> : null}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
}
