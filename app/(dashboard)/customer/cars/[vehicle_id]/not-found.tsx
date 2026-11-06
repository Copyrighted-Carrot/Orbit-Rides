import Link from 'next/link'
export default function MissingVehicle() { return <div className="p-8 space-y-4"><h1 className="text-2xl">Vehicle unavailable</h1><p>This vehicle is not available in the published fleet.</p><Link className="btn" href="/customer/cars">Browse vehicles</Link></div> }
