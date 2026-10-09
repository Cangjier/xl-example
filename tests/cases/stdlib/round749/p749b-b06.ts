// xl:title `Error` 瀹舵棌鐨勫舰鐘朵笌 `instanceof` 閾?// xl:round 749
// xl:judge stdout
const e = new Error("m");
console.log(e.message, e.name, e instanceof Error, e instanceof TypeError);
console.log(Object.prototype.toString.call(e));
const t = new TypeError("tm");
console.log(t.message, t.name, t instanceof Error, t instanceof TypeError);
console.log(new RangeError("r").name, new SyntaxError("s").name, new ReferenceError("x").name);
console.log(typeof (e as any).stack, (e as any).constructor === Error);
class MyErr extends Error {}
const me = new MyErr("mine");
console.log(me.message, me.name, me instanceof MyErr, me instanceof Error, Object.keys(me).join(","));
