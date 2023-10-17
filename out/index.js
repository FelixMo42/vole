// src/index.ts
async function main(gapi) {
  const ctx = { gapi };
  document.getElementById("root").replaceChildren(
    SignInButton(ctx)
  );
}
function SignInButton(ctx) {
  const button = m("button", "sign in");
  button.onclick = () => {
    ctx.gapi.auth.callback = async (resp) => {
      if (resp.error !== void 0)
        throw resp;
      console.log("I'm signed in!");
    };
    if (ctx.gapi.client.getToken() === null) {
      ctx.gapi.auth.requestAccessToken({ prompt: "consent" });
    } else {
      ctx.gapi.auth.requestAccessToken({ prompt: "" });
    }
  };
  return button;
}
function m(tag, ...children) {
  const el = document.createElement(tag);
  el.replaceChildren(...children);
  return el;
}
export {
  main as default
};
