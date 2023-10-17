interface Context {
    
}

export default async function main(gapi) {
    const ctx: Context = { gapi }

    document.getElementById("root").replaceChildren(
        SignInButton(ctx)
    )
}

function SignInButton(ctx) {
    const button = m("button", "sign in")
    button.onclick = () => {
        ctx.gapi.auth.callback = async (resp) => {
            if (resp.error !== undefined) throw (resp);
            console.log("I'm signed in!")
        }

        if (ctx.gapi.client.getToken() === null) {
            ctx.gapi.auth.requestAccessToken({prompt: 'consent'});
        } else {
            ctx.gapi.auth.requestAccessToken({prompt: ''});
        }  
    }
    return button
}

type Node = HTMLElement | string;

function m(tag: string, ...children: Node[]) {
    const el = document.createElement(tag)
    el.replaceChildren(...children)
    return el
}