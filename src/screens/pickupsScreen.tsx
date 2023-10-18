import { on } from "eventmonger"
import { LoggedInScreen } from ".."
import { m } from "../lib/core"
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

function Watch(options) {
    const element = m("div", options, ...options.render())

    on(options.source.update, () => {
        element.replaceChildren(...options.render())
    })

    return element
}

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
        <Watch id="pickups" source={pickups} render={() =>
            pickups.get({ day: ctx.day, activity: "food pickup" }).map((pickup) => {
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
                    <span class="org">{getNickname(pickup.org)}</span>
                    <span class="time">{pickup.time}</span>
                    <span class={buttonClass} onclick={() => {}}>{buttonText}</span>
                </div>
            })
        } />
    </div>
}

function getNickname(org: string) {
    const nicknames = {
        "Davis Food Co-op": "Co-op",
        "Davis Farmer's Market": "Farmer's Market",
        "Sophia's Thai Kitchen": "Sophia's",
        "Insomnia Cookies": "Insomnia",
        "Upper Crust Baking Co": "Upper Crust",
        "Davis Community Meals": "DCM",
    }

    if (org in nicknames) {
        return nicknames[org]
    } else {
        return org
    }
}

function capitilize(text: string) {
    return text.charAt(0).toUpperCase() + text.substring(1)
}