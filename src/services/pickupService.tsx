import Sheet from "../lib/sheet";
import { Day } from "../lib/utils";

export interface Pickup {
    day: Day,
    time: string,
    org: string,
    volunteer1: string,
    volunteer2: string,
    volunteer3: string,
    activity: "food pickup" | "distribution",
    comments: string,   
}

export const pickups = new Sheet<Pickup>({
    sheetId: "1aPaHi5LJ1UB0terT4Tc0XuFE4IIYzjai6d5TM8rtWBQ",
    range: "pickups!A1:H",
})

export function volenteerForPickup(pickup: Pickup, user: string) {
    const update = {}



    pickups.set(pickup, update)
}

export function unvolenteerForPickup(pickup: Pickup, user: string) {
    const update = {}



    pickups.set(pickup, update)
}

export function getNickname(org: string) {
    const nicknames = {
        "Davis Food Co-op": "Co-op",
        "Davis Farmer's Market": "Farmer's Market",
        "Sophia's Thai Kitchen": "Sophia's",
        "Insomnia Cookies": "Insomnia",
        "Upper Crust Baking Co": "Upper Crust",
        "Davis Community Meals": "DCM",
    }

    if (org in nicknames) {
        return nicknames[org]
    } else {
        return org
    }
}

export function getVolenteers(pickup: Pickup) {
    return [
        pickup.volunteer1,
        pickup.volunteer2,
        pickup.volunteer2,
    ].filter((name) => name != "" && name != "NEEDED")
}