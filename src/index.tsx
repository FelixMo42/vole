import { Event, emit } from "eventmonger"
import { LoginScreen, LoginScreenState } from "./screens/loginScreen"
import { PickupScreen, PickupScreenState } from "./screens/pickupsScreen"
import { render } from "./lib/core"
import { Gapi, gapiInit } from "./lib/gapi"

type Screen = LoginScreenState | PickupScreenState

export function goTo(screen: Screen) {
    render({
        "Pickup" : PickupScreen,
        "Login" : LoginScreen,
    }[screen.name](screen))
}

export default async function main(gapi: Gapi) {
    const screen: Screen = {
        name: "Pickup",
        day: "Wed",
        user: "Felix"
    }

    // gapi has been loaded
    emit(gapiInit, gapi)

    goTo(screen)
}

export interface CoreScreen {
    gapi: any;
}

export interface LoggedInScreen {
    user: string;
}