import { LoggedInScreen } from ".."
import Sheet from "../lib/sheet"

export interface PickupScreenState extends LoggedInScreen {
    name: "Pickup",
    day: string,
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"]

function today() {
    return days[new Date().getDay() - 1]
}

export function goToPickupScreen({ day = today() }: { day: string } = { day: today() }) {
    return () => {
        const ctx = {
            name: "Pickup",
            day,
        }
    }
}

const pickups = new Sheet({
    sheetId: "1aPaHi5LJ1UB0terT4Tc0XuFE4IIYzjai6d5TM8rtWBQ",
    range: "pickups!A2:H",
    builder: (row) => ({
        day: capitilize(row[0].substring(0, 3)),
        time: row[1],
        org: row[2],
        voles: [row[3], row[4], row[5]].filter((name) => name != "" && name != "NEEDED"),
        activity: row[6],
        comments: row[7]   
    })
})

export function PickupScreen(ctx: PickupScreenState) {
    return <div id="pickup-screen" class="main">
        <div id="days">
            {days.map((day) =>
                <span
                    class={day == ctx.day ? "selected" : ""}
                    onclick={goToPickupScreen({ day })}
                >{day}</span>
            )}
        </div>
        <div id="pickups">
            {pickups.get({ day: ctx.day }).map((pickup) => {
                const isNeeded = pickup.voles.length === 0
                const isYou = pickup.voles.includes(ctx.name)

                const buttonText =
                    isNeeded ? "NEEDED" :
                    isYou ? "It's you!" :
                        "Shadow"

                const buttonClass =
                    isNeeded ? "needed button" :
                    isYou ? "you button" :
                        "shadow button"

                return <div>
                    <span class="org">{pickup.org}</span>
                    <span class="time">{pickup.time}</span>
                    <span class={buttonClass} onclick={() => {}}>{buttonText}</span>
                </div>
            })}
        </div>
    </div>
}

function capitilize(text: string) {
    return text.charAt(0).toUpperCase() + text.substring(1)
}