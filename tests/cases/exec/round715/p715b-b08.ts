// xl:title delete 之后重新插入排到最后
// xl:round 715
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = { a: 1, b: 2 }; delete o.a; o.a = 3;
console.log(show(Object.keys(o).join(",")));
