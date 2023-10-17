interface Context {
    gapi: any
}

export default async function main(gapi) {
    const ctx: Context = { gapi }

    document.getElementById("root").replaceChildren(
        <img src="./title.png" />,
        SignInButton(ctx)
    )
}

function SignInButton(ctx: Context) {
    return <button id="login" onclick={() => {
        ctx.gapi.auth.callback = async (resp: any) => {
            if (resp.error !== undefined) throw (resp)
            console.log("I'm signed in!")
        }

        if (ctx.gapi.client.getToken() === null) {
            ctx.gapi.auth.requestAccessToken({prompt: 'consent'})
        } else {
            ctx.gapi.auth.requestAccessToken({prompt: ''})
        }
    }}>SIGN IN</button>
}

function m(tag: string, options: any, children: any) {
    // create element
    const el = document.createElement(tag)
    
    for (const [key, val] of Object.entries(options)) {
        el[key] = val
    }

    // add children
    el.replaceChildren(children)

    return el
}