import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
export const getTimestamp = () => Date.now()
