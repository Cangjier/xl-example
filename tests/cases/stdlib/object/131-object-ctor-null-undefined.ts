// xl:title `Object(null)` / `Object(undefined)`：与无实参那一档同一句，都造一个新对象
// xl:round 690
// xl:judge stdout
// xl:why 第 690 轮之前 `Object(null)` / `Object(undefined)` **原样返回那个原始值**——
//       于是 `Object(x) === null` 这种守卫在传了 `null` 的那一次判反（静默错值）。
//       JS 的 `Object(value)` 里 `null` / `undefined` 走 `OrdinaryObjectCreate(%Object.prototype%)`，
//       与 `Object()` 同一句；`new Object(x)` 更是**永远**给新对象（实参完全不参与）。
// xl:end
const a: any = Object(null as any);
const b: any = Object(undefined as any);
const c: any = new Object(null as any);
const d: any = Object();
console.log("obj-null", a === null, typeof a, Object.getPrototypeOf(a) === Object.prototype);
console.log("obj-undef", b === undefined, typeof b);
console.log("new-obj-null", c === null, typeof c);
console.log("obj-none", typeof d, Object.keys(d).length);
console.log("distinct", a === b, a === c, a === d, a === ({} as any));
