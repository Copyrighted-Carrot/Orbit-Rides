import Link from 'next/link'
import { readReviewOverview, type ReviewRating } from '@/lib/activity/reviews'
import { formatRentalDate } from '@/lib/fleet/search'

export function RatingSummary({ rating }: { rating: ReviewRating }) {
    return <p data-testid="rating-summary">{rating.review_count && rating.average_rating !== null
        ? `${rating.average_rating.toFixed(2)} / 5 · ${rating.review_count} completed demo rental ${rating.review_count === 1 ? 'review' : 'reviews'}`
        : 'No completed demo rental reviews yet.'}</p>
}
export default async function VehicleReviews({ vehicleId, page = 1, basePath }: { vehicleId: string; page?: number; basePath: string }) {
    const overview = await readReviewOverview(vehicleId, page)
    const pages = Math.max(1, Math.ceil(overview.review_count / 10))
    const href = (value: number) => basePath + (basePath.includes('?') ? '&' : '?') + 'reviews=' + value + '#vehicle-reviews'
    return <section id="vehicle-reviews" aria-label="Vehicle reviews" className="space-y-4">
        <h2 className="text-xl font-semibold">Completed demo rental reviews</h2><RatingSummary rating={overview} />
        {overview.reviews.map((review, index) => <article key={index} className="border rounded-lg p-4 space-y-2">
            <p>{review.rating} / 5 · Completed demo rental</p><p className="whitespace-pre-wrap break-words">{review.comment}</p><p className="text-sm">{formatRentalDate(review.created_at)} IST</p>
        </article>)}
        {!!overview.review_count && <nav aria-label="Review pages" className="flex gap-4">
            {page > 1 && <Link className="link" href={href(page - 1)}>Previous reviews</Link>}<span>Page {page} of {pages}</span>{page < pages && <Link className="link" href={href(page + 1)}>Next reviews</Link>}
        </nav>}
    </section>
}
