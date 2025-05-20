import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert a Vietnamese text to a slug by removing diacritics, converting to lowercase,
 * replacing spaces with hyphens, and removing special characters
 */
export function slugify(text: string): string {
  // Remove Vietnamese diacritics
  const withoutDiacritics = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");

  // Convert to lowercase, replace spaces with hyphens, remove special chars
  return withoutDiacritics
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove all non-word chars except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with a single hyphen
    .trim(); // Remove whitespace from both ends
}

/**
 * Get the subject avatar URL based on the subject name
 * Returns the slugified name as an image path or default image if not available
 */
export function getSubjectAvatarUrl(subjectName: string): string {
  return `/images/subjects/${slugify(subjectName)}.png`;
}
