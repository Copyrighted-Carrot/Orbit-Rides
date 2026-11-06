import Link from 'next/link'
import FleetSearchForm from '@/app/components/FleetSearchForm'

export default function FindCarForm() {
    return <div className="relative z-10 w-full max-w-4xl my-auto space-y-4">
        <FleetSearchForm requiredDates />
        <Link className="btn btn-neutral" href="/customer/cars">Browse the fleet before choosing dates</Link>
    </div>
}
