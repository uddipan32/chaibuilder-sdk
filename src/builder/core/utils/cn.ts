import { clsx, type ClassValue } from "cnfast";
import { twMerge } from "cnfast";

/**
 * Combines multiple class names and merges Tailwind CSS classes efficiently
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
