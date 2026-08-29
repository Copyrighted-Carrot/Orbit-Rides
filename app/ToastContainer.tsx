'use client'
import {ToastContainer as ToastifyContainer} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import {useTheme} from "next-themes";
import {useEffect, useState} from "react";

export default function ToastContainer() {
    const [mounted, setMounted] = useState(false)
    const {resolvedTheme} = useTheme()

    // useEffect only runs on the client, so now we can safely show the UI
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null;

    return (
        <ToastifyContainer className='my-toast-container' pauseOnFocusLoss={false} position='bottom-right'
                           draggablePercent={15} autoClose={2500}
                           theme={resolvedTheme}/>
    );
}