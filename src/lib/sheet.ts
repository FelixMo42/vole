import { Event, on } from "eventmonger"
import { load } from "..";

async function getRange(gapi: any, spreadsheetId: string, range: string): Promise<string[][]> {
    const response = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId, range });
    return response.result.values
}

export default class Sheet<S> {
    sheetId: string
    range: string
    builder: (row: string[]) => S

    data = []
    loading = true
    update = Event()

    constructor({ sheetId, range, builder }: { sheetId: string, range: string, builder: (row: string[]) => S }) {
        // init
        this.sheetId = sheetId
        this.range = range
        this.builder = builder

        // load
        on(load, async (gapi) => {
            const rows = await getRange(gapi, this.sheetId, this.range)
            this.data = rows.map(this.builder)
            this.loading = false
        })
    }

    get(query: Partial<S>): S[] {
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