import { NextRequest, NextResponse } from 'next/server';

const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(request: NextRequest) {
    if (!GROK_API_KEY) {
        return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { origin, destination, waypoints, car, tripDays } = body;

    if (!origin || !destination) {
        return NextResponse.json({ error: 'Origin and destination are required' }, { status: 400 });
    }

    const waypointList = waypoints?.length > 0 
        ? `\nUser wants to stop at these waypoints along the route: ${waypoints.join(', ')}` 
        : '';

    const carInfo = car 
        ? `\nVehicle: ${car.manufacturer} ${car.model}, Type: ${car.fuelType || 'Petrol'}, Mileage: ~${car.mileage || 15} km/l, Daily rental rate: ₹${car.price_per_day}/day` 
        : '';

    const prompt = `You are an expert Indian road trip planner. Plan a detailed road trip from ${origin} to ${destination} in India for ${tripDays || 3} days.${carInfo}${waypointList}

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
    "route": {
        "totalDistanceKm": number,
        "estimatedDriveTimeHours": number,
        "overview": "brief 1-sentence route description"
    },
    "costs": {
        "fuelCostEstimate": number (in INR based on car mileage and current petrol ~₹105/L or diesel ~₹92/L),
        "tollEstimate": number (in INR, estimate major highway tolls),
        "rentalCost": number (daily rate × days),
        "foodEstimate": number (₹500-800 per person per day reasonable estimate),
        "totalEstimate": number
    },
    "segments": [
        {
            "from": "City/Town Name",
            "to": "City/Town Name", 
            "distanceKm": number,
            "driveTimeHours": number,
            "highlights": "what to see on this stretch"
        }
    ],
    "stops": {
        "fuel": [
            { "name": "Station/Brand name", "location": "Near which town/highway", "type": "petrol|diesel|ev_charging" }
        ],
        "food": [
            { "name": "Restaurant/Dhaba name", "location": "Near which town", "cuisine": "type of food", "priceRange": "₹X-₹Y" }
        ],
        "tolls": [
            { "name": "Toll plaza name", "highway": "NH number", "estimatedCost": number }
        ],
        "rest": [
            { "name": "Rest stop/Hotel name", "location": "Town", "type": "rest_stop|hotel" }
        ]
    },
    "dailyPlan": [
        {
            "day": 1,
            "title": "Day title",
            "driveKm": number,
            "activities": ["activity 1", "activity 2", "activity 3"]
        }
    ],
    "weather": "Brief weather advisory for the route and season",
    "tips": ["Useful tip 1", "Useful tip 2", "Useful tip 3"]
}

Be realistic and accurate with Indian geography, actual highway routes (NH numbers), real toll plazas, popular dhabas/restaurants along highways, and actual distances. Use ONLY Indian locations and rupee amounts.`;

    try {
        const response = await fetch(GROK_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROK_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'You are a precise Indian road trip planning AI. Always respond with valid JSON only. No markdown formatting.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 4000,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Grok API error:', errText);
            return NextResponse.json({ error: 'AI service temporarily unavailable' }, { status: 502 });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return NextResponse.json({ error: 'No response from AI' }, { status: 502 });
        }

        // Parse the JSON response (handle potential markdown wrapping)
        let parsed;
        try {
            const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch {
            console.error('Failed to parse AI response:', content);
            return NextResponse.json({ error: 'Failed to parse trip plan' }, { status: 500 });
        }

        return NextResponse.json(parsed);
    } catch (err: unknown) {
        console.error('Trip planner error:', err);
        return NextResponse.json({ error: 'Failed to generate trip plan' }, { status: 500 });
    }
}
