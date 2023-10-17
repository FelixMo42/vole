const fs = require('fs/promises')
const { build } = require("esbuild")

function make() {
    build({
        entryPoints: [ "src/index.ts" ],
        outfile: "out/index.js",
        platform: "browser",
        format: "esm",
        bundle: true,
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