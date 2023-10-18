import { Event, emit } from "eventmonger"

export interface Gapi {
    client: {
        sheets: {
            spreadsheets: {
                values: {
                    get: (p: {
                        spreadsheetId: string,
                        range: string,
                    }) => Promise<{ result: { values: string[][] } }>
                }
            }
        }
    }
}

export const gapiInit = Event<Gapi>()
