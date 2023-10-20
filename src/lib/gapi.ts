import { Event } from "eventmonger"

export interface Gapi {
    client: {
        sheets: {
            spreadsheets: {
                values: {
                    get: (p: {
                        spreadsheetId: string,
                        range: string,
                    }) => Promise<{ result: { values: string[][] } }>
                    update: (p: {
                        spreadsheetId: string,
                        valueInputOption: string,
                        range: string,
                        requestBody: {
                            values: string[][]
                        }
                    }) => Promise<void>
                }
            }
        }
    }
}

export const gapiInit = Event<Gapi>()
