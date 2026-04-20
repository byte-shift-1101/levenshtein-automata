import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function toTitleCase(str: string): string {
    return str.toLowerCase().replace(/\b\w+/g, (word) => {
        return word[0].toUpperCase() + word.slice(1)
    })
}
