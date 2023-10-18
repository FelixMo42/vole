import { off, on } from "eventmonger"
import { LoggedInScreen, goTo } from ".."
import { m } from "../lib/core"
import Sheet from "../lib/sheet"
import { days, today } from "../lib/utils"

export interface PickupScreenState extends LoggedInScreen {
    name: "Pickup",
    day: string,
}



export function goToPickupScreen({ day = today() }: { day: string } = { day: today() }) {
    return () => {
        goTo({
            name: "Pickup",
            day: day,
            user: "Felix",
        })
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

    const callback = () => {
        if (document.body.contains(element)) {
            element.replaceChildren(...options.render())
        } else {
            console.log("OFFFFFFFF")
            off(options.source.update, callback)
        }
    }

    on(options.source.update, callback)

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
                const isYou = pickup.voles.includes(ctx.user)

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