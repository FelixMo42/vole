const fs = require('fs/promises')
const { build } = require("esbuild")

function make() {
    build({
        entryPoints: [ "src/index.tsx" ],
        outfile: "out/index.js",
        platform: "browser",
        format: "esm",
        bundle: true,
        jsxFactory: 'm',
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