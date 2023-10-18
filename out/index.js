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


// node_modules/eventmonger/src/index.ts
function Event() {
  return [];
}
function emit(event, p) {
  event.forEach((callback) => callback(p));
}
function on(event, callback) {
  event.push(callback);
  return callback;
}
function off(event, callback) {
  let last = event.length - 1;
  for (let i = last; i >= 0; i--) {
    if (event[i] == callback) {
      event[i] = event[last];
      event.pop();
      return callback;
    }
  }
  return callback;
}

// src/lib/core.ts
function m2(tag, options, ...children) {
  if (typeof tag === "function")
    return tag(options, children);
  const el = document.createElement(tag);
  if (options) {
    for (const [key, val] of Object.entries(options)) {
      if (key === "class") {
        el.className = val;
      } else {
        el[key] = val;
      }
    }
  }
  const childrenFlattened = [];
  for (const child of children) {
    if (Array.isArray(child)) {
      childrenFlattened.push(...child);
    } else {
      childrenFlattened.push(child);
    }
  }
  el.replaceChildren(...childrenFlattened);
  return el;
}
function render(screen) {
  document.getElementById("root").replaceChildren(screen);
}

// src/lib/gapi.ts
var gapiInit = Event();

// src/lib/sheet.ts
async function getRange(gapi, spreadsheetId, range) {
  const response = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId, range });
  return response.result.values;
}
var Sheet = class {
  sheetId;
  range;
  builder;
  data = [];
  loading = true;
  update = Event();
  constructor({ sheetId, range, builder }) {
    this.sheetId = sheetId;
    this.range = range;
    this.builder = builder;
    on(gapiInit, async (gapi) => {
      const rows = await getRange(gapi, this.sheetId, this.range);
      this.data = rows.filter((row) => row.length > 0).map(this.builder);
      this.loading = false;
      emit(this.update, this);
      console.log("loaded!");
    });
  }
  get(query) {
    console.log("get");
    return this.data.filter((s) => {
      for (const [k, v] of Object.entries(query)) {
        if (s[k] !== v) {
          return false;
        }
      }
      return true;
    });
  }
};

// src/lib/utils.ts
var days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
function today() {
  return days[(/* @__PURE__ */ new Date()).getDay() - 1];
}

// src/screens/pickupsScreen.tsx
function goToPickupScreen({ day = today() } = { day: today() }) {
  return () => {
    goTo({
      name: "Pickup",
      day,
      user: "Felix"
    });
  };
}
var pickups = new Sheet({
  sheetId: "1aPaHi5LJ1UB0terT4Tc0XuFE4IIYzjai6d5TM8rtWBQ",
  range: "pickups!A2:H",
  builder: (row) => ({
    day: capitilize(row[0].substring(0, 3)),
    time: row[1],
    org: row[2],
    voles: [row[3], row[4], row[5]].filter((name) => name != "" && name != "NEEDED"),
    activity: row[6],
    comments: row[7]
  })
});
function Watch(options) {
  const element = m2("div", options, ...options.render());
  const callback = () => {
    if (document.body.contains(element)) {
      element.replaceChildren(...options.render());
    } else {
      console.log("OFFFFFFFF");
      off(options.source.update, callback);
    }
  };
  on(options.source.update, callback);
  return element;
}
function PickupScreen(ctx) {
  return /* @__PURE__ */ m2("div", { id: "pickup-screen", class: "main" }, /* @__PURE__ */ m2("div", { id: "days" }, days.map(
    (day) => /* @__PURE__ */ m2(
      "span",
      {
        class: day == ctx.day ? "selected" : "",
        onclick: goToPickupScreen({ day })
      },
      day
    )
  )), /* @__PURE__ */ m2(Watch, { id: "pickups", source: pickups, render: () => pickups.get({ day: ctx.day, activity: "food pickup" }).map((pickup) => {
    const isNeeded = pickup.voles.length === 0;
    const isYou = pickup.voles.includes(ctx.user);
    const buttonText = isNeeded ? "NEEDED" : isYou ? "It's you!" : "Shadow";
    const buttonClass = isNeeded ? "needed button" : isYou ? "you button" : "shadow button";
    return /* @__PURE__ */ m2("div", null, /* @__PURE__ */ m2("span", { class: "org" }, getNickname(pickup.org)), /* @__PURE__ */ m2("span", { class: "time" }, pickup.time), /* @__PURE__ */ m2("span", { class: buttonClass, onclick: () => {
    } }, buttonText));
  }) }));
}
function getNickname(org) {
  const nicknames = {
    "Davis Food Co-op": "Co-op",
    "Davis Farmer's Market": "Farmer's Market",
    "Sophia's Thai Kitchen": "Sophia's",
    "Insomnia Cookies": "Insomnia",
    "Upper Crust Baking Co": "Upper Crust",
    "Davis Community Meals": "DCM"
  };
  if (org in nicknames) {
    return nicknames[org];
  } else {
    return org;
  }
}
function capitilize(text) {
  return text.charAt(0).toUpperCase() + text.substring(1);
}

// src/screens/loginScreen.tsx
function LoginScreen(ctx) {
  return /* @__PURE__ */ m("div", { id: "login-screen", class: "main" }, /* @__PURE__ */ m("img", { src: "./assets/title.png" }), /* @__PURE__ */ m("input", { placeholder: "enter name" }), /* @__PURE__ */ m("button", { onclick: login }, "START"));
}
function login() {
  const name = document.querySelector("#login-screen input");
  goToPickupScreen();
}

// src/index.tsx
function goTo(screen) {
  render({
    "Pickup": PickupScreen,
    "Login": LoginScreen
  }[screen.name](screen));
}
async function main(gapi) {
  const screen = {
    name: "Pickup",
    day: "Wed",
    user: "Felix"
  };
  emit(gapiInit, gapi);
  goTo(screen);
}
export {
  main as default,
  goTo
};
