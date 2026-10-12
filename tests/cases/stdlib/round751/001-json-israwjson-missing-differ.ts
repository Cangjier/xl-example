// xl:title `JSON.isRawJSON`
// xl:round 751
// xl:judge stdout
// xl:want differ
// xl:why **`JSON.isRawJSON`**：Node 里它是 `function` 且 `JSON.isRawJSON({})` 给**假**，本仓没有那一格 ⇒ 调它抛 `TypeError`。
// xl:why **它可以真做**（认的是 `JSON.rawJSON()` 造出来的那个对象身上那一格内部标记），
// xl:why 但要**先把 `JSON.rawJSON` 造出来**——那是这一族的另一半，所以原样登在这里。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log("JSON.isRawJSON({})", show(() => JSON.isRawJSON({})));
console.log("Object.prototype.toString.", show(() => Object.prototype.toString.call(JSON)));
