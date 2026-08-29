'use server';

// TODO: Replace with real Stripe integration when keys are available.
// The API surface is preserved so switching to Stripe is a single-file change.
// When integrating Stripe:
//   1. npm install stripe
//   2. Set STRIPE_SECRET_KEY in .env.local
//   3. Replace the simulated session below with stripe.checkout.sessions.create()

export async function createCheckoutSession(carDetails: {
    name: string;
    price: number;
    imageUrls: string[]
}, successUrl: string, cancelUrl: string)
{
    const data: { url: string | null, error: string | null } = {url: null, error: null};
    try
    {
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Generate a simulated session ID
        const sessionId = `sim_${crypto.randomUUID()}`;
        
        // Build the success URL with the session ID
        const url = successUrl.replace('{CHECKOUT_SESSION_ID}', sessionId);
        data.url = url;

        // Log for debugging (cancelUrl preserved for Stripe integration)
        console.log(`[Simulated Payment] ${carDetails.name} — ₹${carDetails.price.toLocaleString('en-IN')} | Cancel URL: ${cancelUrl}`);
    } catch (error)
    {
        data.error = `Payment processing failed: ${error}`;
    }

    return data;
}
