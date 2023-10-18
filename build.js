const fs = require('fs/promises')
const { build } = require("esbuild")

const banner = `\
function m(t, o, ...c) {
    if (typeof t === "function") return t(o, c)

    const e = document.createElement(t)
    
    if (o) {
        for (const [k, v] of Object.entries(o)) {
            if (k === "class") {
                e.className = v
            } else {
                e[k] = v
            }
        }
    }
    const f = []
    for (const j of c) {
        if (Array.isArray(j)) {
            f.push(...j)
        } else {
            f.push(j)
        }
    }
    e.replaceChildren(...f)
    return e
}
`

function make() {
    build({
        entryPoints: [ "src/index.tsx" ],
        outfile: "out/index.js",
        platform: "browser",
        format: "esm",
        bundle: true,
        jsxFactory: 'm',
        banner: {
            js: banner
        }
    })
}

async function main() {
    make()

    const events = fs.watch("./src/", { recursive: true })

    for await (const _event of events) {
        console.log("rebuilding...")
        make()
    }
}

main()