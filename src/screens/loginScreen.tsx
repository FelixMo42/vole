import { goTo } from ".."
import { setCookie } from "../lib/cookies"
import { today } from "../lib/utils"

export interface LoginScreenState {
    name: "Login"
}

export function LoginScreen(ctx: LoginScreenState) {
    return <div id="login-screen" class="main">
        <img src="./assets/title.png" />
        <input placeholder="enter name" />
        <button onclick={login}>START</button>
        <div id="error" />
    </div>
}

export function login() {
    const user = document.querySelector("#login-screen input").value.trim()

    if (!user) {
        document.getElementById("error").innerText = "name can not be blank!"
    } else {
        setCookie("user", user, 10000)

        goTo({
            name: "Pickup",
            day: today(),
            user
        })
    }
}