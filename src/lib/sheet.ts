import { Event, emit, on } from "eventmonger"
import { Gapi, gapiInit } from "./gapi";

export default class Sheet<S> {
    sheetId: string
    range: string

    data = []
    header = []
    loading = true
    update = Event<Sheet<S>>()
    gapi: Gapi

    constructor({ sheetId, range }: { sheetId: string, range: string }) {
        // init
        this.sheetId = sheetId
        this.range = range

        // load
        on(gapiInit, async (gapi) => {
            this.gapi = gapi
            await this.reload()
            this.loading = false
        })
    }

    async reload() {
        // get raw data from spread sheet
        const [header, ...rows] = await getRange(this.gapi, this.sheetId, this.range)

        // save header
        this.header = header.map(formatKey)

        // build data
        this.data = rows
            // .filter((row) => row.length > 0)
            .map((row) => {
                const obj = {}
                for (let i = 0; i < header.length; i++) {
                    obj[this.header[i]] = row[i]
                }
                return obj
            })

        // tell the world that we've updated
        emit(this.update, this)
    }

    get(query: Partial<S>): S[] {
        return this.data.filter((s: S) => Object.entries(query).every(([k, v]) => s[k] === v))
    }

    async set(query: Partial<S>, update: Partial<S>) {
        // fingure out the new data
        const obj = this.get(query)[0]
        const newObj = { ...obj, ...update }
        const row = this.header.map((key) => newObj[key] ?? '')

        // figure out the area in the spread sheet that needs to be updated
        const objIndex = this.data.findIndex((o) => o === obj)
        const gridrange = a1RangeToGridRange(this.range)
        const rowNumber = (gridrange.a.row || 1) + objIndex + 1
        const range = gridRangeToA1Range({
            sheet: gridrange.sheet,
            a: {
                col: gridrange.a.col,
                row: rowNumber
            },
            b: {
                col: gridrange.b.col,
                row: rowNumber
            },
        })

        // update the spread sheet
        await this.gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.sheetId,
            valueInputOption: 'USER_ENTERED',
            range,
            requestBody: { values: [row] }
        })
        
        // we need to update what we have locally
        await this.reload()
    }
}

async function getRange(gapi: Gapi, spreadsheetId: string, range: string): Promise<string[][]> {
    const response = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId, range });
    return response.result.values
}

function formatKey(key: string) {
    return key.replace(" ", "")
}

interface GridRange {
    sheet: string;
    a: {
        col: string;
        row?: number;
    };
    b: {
        col: string;
        row?: number;
    };
}


function gridRangeToA1Range(r: GridRange): string {
    return `${r.sheet}!${r.a.col}${r.a.row ?? ''}:${r.b.col}${r.b.row ?? ''}`;
}

function a1RangeToGridRange(range: string): GridRange {
    const [area, sheet] = range.split('!').reverse();
    const [a, b] = area.split(':');

    function parseCell(cell: string) {
        if (!cell) throw new Error(`Invalid a1range ${range}!`);
        const matchs = cell.match(/([A-Z]+)(\d*)/);
        const col = matchs[1];
        if (!col) throw new Error(`Invalid a1range ${range}!`);
        const row = matchs[2];
        return {
            col,
            row: row ? parseInt(row) : undefined
        };
    }

    return {
        sheet,
        a: parseCell(a),
        b: parseCell(b)
    };
}