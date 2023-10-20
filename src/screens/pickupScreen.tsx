import { off, on } from "eventmonger"
import { LoggedInScreen, goTo } from ".."
import { m } from "../lib/core"
import { Day, days } from "../lib/utils"
import { getNickname, getVolenteers, pickups, unvolenteerForPickup, volenteerForPickup } from "../services/pickupService"

export interface PickupScreenState extends LoggedInScreen {
    name: "Pickup",
    day: Day,
}

export function PickupScreen(ctx: PickupScreenState) {
    console.log(ctx.day)
    return <div id="pickup-screen" class="main">
        <div id="days">
            {days.map((day) =>
                <span
                    class={day == ctx.day ? "selected" : ""}
                    onclick={() => goTo({ ...ctx, day })}
                >{dayHeader(day)}</span>
            )}
        </div>
        <Watch id="pickups" source={pickups} render={() =>
            pickups.get({ day: ctx.day, activity: "food pickup" }).map((pickup) => {
                const isNeeded = getVolenteers(pickup).length === 0
                const isYou = getVolenteers(pickup).includes(ctx.user)

                const buttonText =
                    isNeeded ? "NEEDED" :
                    isYou ? "It's you!" :
                        "Shadow"

                const buttonClass =
                    isNeeded ? "needed button" :
                    isYou ? "you button" :
                        "shadow button"

                return <div onclick={() => {}}>
                    <span class="org">{getNickname(pickup.org)}</span>
                    <span class="time">{pickup.time}</span>
                    <span class={buttonClass} onclick={() => {
                        if (isYou) {
                            unvolenteerForPickup(pickup, ctx.user)
                        } else {
                            volenteerForPickup(pickup, ctx.user)
                        }
                    }}>{buttonText}</span>
                </div>
            })
        } />
    </div>
}

function dayHeader(day: Day) {
    return capitilize(day.substring(0, 3))
}

function capitilize(text: string) {
    return text.charAt(0).toUpperCase() + text.substring(1)
}

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