import { Event } from "eventmonger"
import { LoginScreen, LoginScreenState } from "./screens/loginScreen"
import { PickupScreen, PickupScreenState } from "./screens/pickupsScreen"
import { render } from "./lib/core"

type Screen = LoginScreenState | PickupScreenState

export const load = Event()

export default async function main(gapi) {
    const screen: Screen = {
        name: "Pickup",
        day: "Tue"
    }

    // gapi has been loaded
    load.fire(gapi)

    render({
        "Pickup" : PickupScreen,
        "Login" : LoginScreen,
    }[screen.name](screen))
}

export interface CoreScreen {
    gapi: any;
}

export interface LoggedInScreen {
    name: string;
}