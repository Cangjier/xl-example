// xl:title `Object.prototype.toString.call(箱)`：三族包装对象各有各的标签
// xl:round 690
// xl:judge stdout
// xl:why JS 的算法里 `[[NumberData]]` / `[[StringData]]` / `[[BooleanData]]`
//       就是 `"Number"` / `"String"` / `"Boolean"` 三个标签，而本仓的箱
//       **已经把那个原值存在 `__box` 那一格里**（`MakeBox`）——第 690 轮之前
//       这一格一律落成 `"[object Object]"`（箱造出来了、`typeof` / `valueOf` / 加法都对，
//       只有标签在说谎，`137-beh-boxed-primitives` 量的就是它）。
// xl:end
const n: any = new Number(3);
const s: any = new String("ab");
const b: any = new Boolean(false);
console.log(Object.prototype.toString.call(n));
console.log(Object.prototype.toString.call(s));
console.log(Object.prototype.toString.call(b));
console.log(({}).toString());
