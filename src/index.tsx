import { emit } from "eventmonger"
import { LoginScreen, LoginScreenState } from "./screens/loginScreen"
import { PickupScreen, PickupScreenState } from "./screens/pickupScreen"
import { render } from "./lib/core"
import { Gapi, gapiInit } from "./lib/gapi"
import { getCookie } from "./lib/cookies"
import { today } from "./lib/utils"

type Screen = LoginScreenState | PickupScreenState

export function goTo(screen: Screen) {
    render({
        "Pickup" : PickupScreen,
        "Login" : LoginScreen,
    }[screen.name](screen))
}

export default async function main(gapi: Gapi) {
    // gapi has been loaded
    emit(gapiInit, gapi)

    const user = getCookie("user")

    // if (user) {
    //     goTo({
    //         name: "Pickup",
    //         day: today(),
    //         user,
    //     })
    // } else {
        goTo({
            name: "Login"
        })
    // }
}

export interface LoggedInScreen {
    user: string;
}
