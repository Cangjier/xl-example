// xl:title 内建构造函数当原型：不被当成原始值抛掉
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = {};
console.log(t(() => String(Object.setPrototypeOf(o, Math as any) === o) + "|" + String(Reflect.setPrototypeOf({}, Math as any))));
