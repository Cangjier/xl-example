// xl:title 私有成员：品牌检查与 `#x in o`
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { #m() { return 1; } call(o) { return o.#m(); } }
const a = new A();
run(() => { console.log(show(a.call({}))); });
console.log(show(a.call(a)));

(() => {
class A { #x = 1; has(o) { return #x in o; } }
const a = new A();
console.log(show(a.has(a)) + "," + show(a.has({})));
})();
