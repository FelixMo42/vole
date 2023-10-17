// src/index.tsx
async function main(gapi) {
  const ctx = { gapi };
  document.getElementById("root").replaceChildren(
    /* @__PURE__ */ m("img", { src: "./title.png" }),
    SignInButton(ctx)
  );
}
function SignInButton(ctx) {
  return /* @__PURE__ */ m("button", { id: "login", onclick: () => {
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
  } }, "SIGN IN");
}
function m(tag, options, children) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(options)) {
    el[key] = val;
  }
  el.replaceChildren(children);
  return el;
}
export {
  main as default
};
