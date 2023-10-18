export function m(tag: string, options: any, ...children: any[]) {
    const el = document.createElement(tag)
    
    if (options) {
        for (const [key, val] of Object.entries(options)) {
            if (key === "class") {
                el.className = val as string
            } else {
                el[key] = val
            }
        }
    }

    const childrenFlattened = []
    for (const child of children) {
        if (Array.isArray(child)) {
            childrenFlattened.push(...child)
        } else {
            childrenFlattened.push(child)
        }
    }
    el.replaceChildren(...childrenFlattened)

    return el
}

export function render(screen: Node) {
    document.getElementById("root").replaceChildren(screen) 
}