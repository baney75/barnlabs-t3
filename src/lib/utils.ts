// Minimal fallbacks if types are missing in local env
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { clsx, type ClassValue } from "clsx";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
