import { CoreScreen } from ".."
import { goToPickupScreen } from "./pickupsScreen"

export interface LoginScreenState extends CoreScreen {
    name: "Login"
}

export function LoginScreen(ctx: LoginScreenState) {
    return <div id="login-screen" class="main">
        <img src="./assets/title.png" />
        <input placeholder="enter name" />
        <button onclick={login}>START</button>
    </div>
}

export function login() {
    const name = document.querySelector("#login-screen input")

    goToPickupScreen()
}