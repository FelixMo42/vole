export const days = ["Mon", "Tue", "Wed", "Thu", "Fri"]

export function today() {
    return days[new Date().getDay() - 1]
}