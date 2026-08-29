// ============================================================
// Orbit Rides — Shared Utilities
// ============================================================

/**
 * Format a price with currency symbol.
 * Centralised so the entire app uses consistent currency formatting.
 */
export function formatPrice(amount: number, currency: 'USD' | 'INR' = 'INR'): string {
    const formatter = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
    return formatter.format(amount);
}

/**
 * Calculate the number of days from a date range string like "Jul 20, 2026 - Jul 23, 2026".
 * Returns at least 1 day.
 */
export function getDaysCountFromDateRange(dateRange: string): number {
    if (!dateRange || typeof dateRange !== 'string') return 1;
    
    const parts = dateRange.split(' - ');
    if (parts.length !== 2) return 1;

    try {
        const startDate = new Date(parts[0].trim());
        const endDate = new Date(parts[1].trim());

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 1;

        const diffMs = endDate.getTime() - startDate.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return Math.max(1, diffDays);
    } catch {
        return 1;
    }
}

/**
 * Get a time-of-day greeting.
 */
export function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

/**
 * Generate a unique booking reference.
 */
export function generateBookingRef(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORB-${timestamp}-${random}`;
}

/**
 * Get initials from a display name.
 */
export function getInitials(name: string | null | undefined): string {
    if (!name) return '?';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format a date string to a human-readable format.
 */
export function formatDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

/**
 * Calculate time elapsed since a date (e.g., "2 hours ago").
 */
export function timeAgo(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return formatDate(dateStr);
    } catch {
        return dateStr;
    }
}