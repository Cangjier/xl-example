// xl:title Reflect.isExtensible / preventExtensions
// xl:round 717
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = {};
console.log(show(Reflect.isExtensible(o)) + "|" + show(Reflect.preventExtensions(o)) + "|" + show(Reflect.isExtensible(o)));
