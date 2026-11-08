import RentalReviewForm from './RentalReviewForm'
import { readBookingReview } from '@/lib/activity/reviews'
import { formatRentalDate } from '@/lib/fleet/search'

export default async function BookingReview({ bookingId, state, userId, role }: { bookingId: string; state: string; userId: string; role: 'customer' | 'admin' }) {
    const review = await readBookingReview(bookingId)
    return <section id="rental-review" aria-label="Rental review" className="border rounded-lg p-5 space-y-3">
        <h2 className="text-xl font-semibold">Rental review</h2>
        {review ? <><p>{review.rating} / 5 · Completed demo rental</p><p className="whitespace-pre-wrap break-words">{review.comment}</p><p>Submitted {formatRentalDate(review.created_at)} IST</p></>
            : state === 'completed' && role === 'customer' ? <RentalReviewForm bookingId={bookingId} userId={userId} />
            : <p>{state === 'completed' ? 'The customer has not submitted a review.' : 'Reviews are available only after a rental is completed.'}</p>}
    </section>
}
