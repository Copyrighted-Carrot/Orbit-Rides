'use client'
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Car } from '@/lib/types/models';

interface WishlistContextType {
    wishlist: Car[];
    addToWishlist: (car: Car) => void;
    removeFromWishlist: (carId?: number) => void;
    isInWishlist: (carId?: number) => boolean;
    toggleWishlist: (car: Car) => void;
    isDrawerOpen: boolean;
    setIsDrawerOpen: (open: boolean) => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
    const [wishlist, setWishlist] = useState<Car[]>([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('orbit_rides_wishlist');
            if (saved) {
                setWishlist(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load wishlist", e);
        }
    }, []);

    const saveToStorage = (updated: Car[]) => {
        setWishlist(updated);
        try {
            localStorage.setItem('orbit_rides_wishlist', JSON.stringify(updated));
        } catch (e) {
            console.error("Failed to save wishlist", e);
        }
    };

    const addToWishlist = (car: Car) => {
        if (car.id && !wishlist.some(item => item.id === car.id)) {
            saveToStorage([...wishlist, car]);
        }
    };

    const removeFromWishlist = (carId?: number) => {
        if (!carId) return;
        saveToStorage(wishlist.filter(item => item.id !== carId));
    };

    const isInWishlist = (carId?: number) => {
        if (!carId) return false;
        return wishlist.some(item => item.id === carId);
    };

    const toggleWishlist = (car: Car) => {
        if (isInWishlist(car.id)) {
            removeFromWishlist(car.id);
        } else {
            addToWishlist(car);
        }
    };

    return (
        <WishlistContext.Provider
            value={{
                wishlist,
                addToWishlist,
                removeFromWishlist,
                isInWishlist,
                toggleWishlist,
                isDrawerOpen,
                setIsDrawerOpen,
            }}
        >
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
}
