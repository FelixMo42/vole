import { emit } from "eventmonger"
import { LoginScreen, LoginScreenState } from "./screens/loginScreen"
import { PickupScreen, PickupScreenState } from "./screens/pickupsScreen"
import { render } from "./lib/core"
import { Gapi, gapiInit } from "./lib/gapi"

type Screen = LoginScreenState | PickupScreenState


export default async function main(gapi: Gapi) {
    const screen: PickupScreenState = {
        name: "Pickup",
        day: "Tue"
    }

    // gapi has been loaded
    emit(gapiInit, gapi)

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