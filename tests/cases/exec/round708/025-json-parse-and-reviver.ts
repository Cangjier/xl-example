// xl:title JSON.parse 的 reviver 与往返
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = JSON.parse('{"a": 1, "b": 2}', (k, v) => (k === "b" ? undefined : v));
console.log(JSON.stringify(o));

(() => {
console.log(JSON.stringify(JSON.parse('{"a":[1,2,{"b":null}]}')));
})();
