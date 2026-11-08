import Link from 'next/link'
import type { FleetCard } from '@/lib/fleet/catalogue'
import { formatMoney, toSearchParams, type SearchFilters } from '@/lib/fleet/search'
import { RatingSummary } from './VehicleReviews'

export default function CarComparator({ vehicles, availability, filters }: { vehicles: FleetCard[]; availability: (boolean | null)[]; filters: Partial<SearchFilters> }) {
    const query = toSearchParams(filters).toString()
    return <div className="overflow-x-auto"><table className="table border">
        <caption className="text-left mb-4">Current catalogue attributes. Rates are per started 24 hours; the trusted quote determines the final demo rental value.</caption>
        <thead><tr><th scope="col">Attribute</th>{vehicles.map(vehicle => <th scope="col" key={vehicle.id}>{vehicle.manufacturer} {vehicle.model}</th>)}</tr></thead>
        <tbody>
            <tr><th scope="row">Manufacturer</th>{vehicles.map(vehicle => <td key={vehicle.id}>{vehicle.manufacturer}</td>)}</tr>
            <tr><th scope="row">Model</th>{vehicles.map(vehicle => <td key={vehicle.id}>{vehicle.model}</td>)}</tr>
            <tr><th scope="row">Vehicle type</th>{vehicles.map(vehicle => <td key={vehicle.id}>{vehicle.type_name}</td>)}</tr>
            <tr><th scope="row">Rate (INR)</th>{vehicles.map(vehicle => <td key={vehicle.id}>{formatMoney(vehicle.daily_rate_minor)}</td>)}</tr>
            <tr><th scope="row">Current condition</th>{vehicles.map(vehicle => <td key={vehicle.id}>{vehicle.operational_state}</td>)}</tr>
            <tr><th scope="row">Stored review rating</th>{vehicles.map(vehicle => <td key={vehicle.id}><RatingSummary rating={vehicle} /></td>)}</tr>
            <tr><th scope="row">Selected dates</th>{vehicles.map((vehicle, index) => <td key={vehicle.id}>{availability[index] === null ? 'Choose dates to check' : availability[index] ? 'Available when checked' : 'Unavailable'}</td>)}</tr>
            <tr><th scope="row">Details</th>{vehicles.map(vehicle => <td key={vehicle.id}><Link className="link" href={'/customer/cars/' + vehicle.id + (query ? '?' + query : '')}>View {vehicle.manufacturer} {vehicle.model}</Link></td>)}</tr>
        </tbody>
    </table></div>
}
