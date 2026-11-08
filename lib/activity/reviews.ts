import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/clean.types'
import { jsonRecord } from './data'

export type ReviewRating = { review_count: number; average_rating: number | null }
export type PublicReview = { rating: number; comment: string; created_at: string }
export async function readReviewRatings(ids: string[]) {
    const client = await createClient<Database>()
    if (!ids.length) return new Map<string, ReviewRating>()
    const { data, error } = await client.rpc('vehicle_review_summaries', { p_vehicle_ids: ids })
    if (error) throw new Error('Vehicle ratings could not be loaded. Please retry.')
    return new Map(data.map(item => [item.vehicle_id, { review_count: item.review_count, average_rating: item.average_rating as number | null }]))
}
export async function readReviewOverview(vehicleId: string, page = 1) {
    const client = await createClient<Database>()
    const { data, error } = await client.rpc('vehicle_review_overview', { p_vehicle_id: vehicleId, p_limit: 10, p_offset: (page - 1) * 10 })
    if (error || !jsonRecord(data) || typeof data.review_count !== 'number' || !Number.isSafeInteger(data.review_count)
        || (data.average_rating !== null && typeof data.average_rating !== 'number') || !Array.isArray(data.reviews)) throw new Error('Vehicle reviews could not be loaded. Please retry.')
    const reviews = data.reviews
    return { review_count: data.review_count, average_rating: data.average_rating, reviews: reviews.map(value => {
        if (!jsonRecord(value) || typeof value.rating !== 'number' || typeof value.comment !== 'string' || typeof value.created_at !== 'string') throw new Error('Review response was invalid.')
        return { rating: value.rating, comment: value.comment, created_at: value.created_at }
    }) }
}
export async function readBookingReview(bookingId: string) {
    const client = await createClient<Database>()
    const { data, error } = await client.from('reviews').select('rating,comment,created_at').eq('booking_id', bookingId).maybeSingle()
    if (error) throw new Error('The rental review could not be loaded. Please retry.')
    return data
}
