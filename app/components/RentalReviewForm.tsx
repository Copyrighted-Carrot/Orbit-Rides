'use client'
import { useState, type FormEvent } from 'react'
import { submitRentalReview } from '@/app/(dashboard)/customer/activity/actions'

export default function RentalReviewForm({ bookingId, userId }: { bookingId: string; userId: string }) {
    const [pending, setPending] = useState(false), [error, setError] = useState('')
    const [rating, setRating] = useState(''), [comment, setComment] = useState('')
    const savedPath = '/customer/bookings/' + bookingId
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        setPending(true); setError('')
        try {
            const result = await submitRentalReview(form)
            if (result.ok) { window.location.assign(savedPath); return }
            setError(result.error || 'The saved review could not be verified.')
        } catch { setError('The response was interrupted. Reload to see whether your review was saved. Repeating the same review is safe.') }
        finally { setPending(false) }
    }
    return <form onSubmit={submit} className="space-y-4" aria-label="Review completed rental">
        <input type="hidden" name="user_id" value={userId} /><input type="hidden" name="booking_id" value={bookingId} />
        <p>One review per completed demo rental. Reviews are published without your name. Do not include personal information.</p>
        <div className="form-control gap-1"><label htmlFor={`review-rating-${bookingId}`}>Rating</label><select id={`review-rating-${bookingId}`} name="rating" className="select select-bordered" required value={rating} onChange={event => setRating(event.target.value)}><option value="">Choose a rating</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} out of 5</option>)}</select></div>
        <div className="form-control gap-1"><label htmlFor={`review-comment-${bookingId}`}>Your review</label><textarea id={`review-comment-${bookingId}`} className="textarea textarea-bordered" name="comment" required maxLength={1000} value={comment} onChange={event => setComment(event.target.value)} /></div>
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Submit review'}</button>
        {error && <div role="alert"><p>{error}</p><a className="link" href={savedPath}>Reload saved review</a></div>}
    </form>
}
