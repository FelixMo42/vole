export const days = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const
export type Day = typeof days[number];

export function today() {
    return days[new Date().getDay() - 1]
}