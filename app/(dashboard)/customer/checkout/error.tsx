'use client'
export default function CheckoutError() { return <div className="p-8 space-y-4"><h1 className="text-2xl">Checkout could not be loaded</h1><p role="alert">No result can be assumed. Reload to read the saved reservation before retrying.</p><button className="btn" onClick={() => window.location.reload()}>Reload checkout</button></div> }
