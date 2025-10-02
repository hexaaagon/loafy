import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function absoluteUrl(path: string = "/") {
  path = path.startsWith("/") ? path : `/${path}`;

  return `${process.env.BETTER_AUTH_URL}${path}`;
}
