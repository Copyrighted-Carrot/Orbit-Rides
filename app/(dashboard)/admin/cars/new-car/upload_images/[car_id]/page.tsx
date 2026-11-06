import UploadNewCarImagesPageContent from './UploadNewCarImagesPageContent'
import { readAdminVehicle, readAdminMedia } from '@/lib/fleet/admin'

export const metadata = { title: 'Vehicle gallery | Orbit Rides', robots: { index: false, follow: false } }
export default async function GalleryPage({ params, searchParams }: { params: Promise<{ car_id: string }>; searchParams: Promise<{ state?: string; page?: string }> }) {
    const { car_id } = await params
    const vehicle = await readAdminVehicle(car_id)
    const gallery = await readAdminMedia(vehicle.id, await searchParams)
    return <UploadNewCarImagesPageContent vehicle={vehicle} gallery={gallery} />
}
