// xl:title GeneratorFunction 的构造器名
// xl:round 710
// xl:judge stdout
// xl:want differ
// xl:why 同 `p710c-c08`：`(function* () {}).constructor.name` 在 Node 里是 `GeneratorFunction`，本仓给 `Function`（与 `probe697-z08` / `z09` 同一条根）。要做。
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function* () {}).constructor.name)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
