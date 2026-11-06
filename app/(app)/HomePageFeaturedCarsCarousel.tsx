import CarCard from '@/app/(dashboard)/customer/cars/CarCard'
import type { FleetCard } from '@/lib/fleet/catalogue'

export default function HomePageFeaturedCarsCarousel({ className = '', cars }: { className?: string; cars: FleetCard[] }) {
    return <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>{cars.map(vehicle => <CarCard key={vehicle.id} vehicle={vehicle} />)}</div>
}
