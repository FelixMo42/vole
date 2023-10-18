import { Event, emit, on } from "eventmonger"
import { Gapi, gapiInit } from "./gapi";

async function getRange(gapi: Gapi, spreadsheetId: string, range: string): Promise<string[][]> {
    const response = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId, range });
    return response.result.values
}

export default class Sheet<S> {
    sheetId: string
    range: string
    builder: (row: string[]) => S

    data = []
    loading = true
    update = Event<Sheet<S>>()

    constructor({ sheetId, range, builder }: { sheetId: string, range: string, builder: (row: string[]) => S }) {
        // init
        this.sheetId = sheetId
        this.range = range
        this.builder = builder

        // load
        on(gapiInit, async (gapi) => {
            const rows = await getRange(gapi, this.sheetId, this.range)
            this.data = rows
                .filter((row) => row.length > 0)
                .map(this.builder)
            this.loading = false
            emit(this.update, this)
            console.log("loaded!")
        })
    }

    get(query: Partial<S>): S[] {
        console.log("get")
        return this.data.filter((s: S) => {
            for (const [k, v] of Object.entries(query)) {
                if (s[k] !== v) {
                    return false
                }
            }

            return true
        })
    }
}