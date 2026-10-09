// xl:title `for..in` 的次序、原型链与三种接收者（对象 / 数组 / 无原型对象）
// xl:round 767
// xl:judge stdout
// xl:note `for..in` 的属性次序与 `Object.keys` **同一条**（整数键在前、其余按插入序），
// xl:note 差别只有一条：它**沿着原型链**走（`Object.keys` 只看自有）。
// xl:note 数组那一档把下标与自有的额外属性一起列出来（下标是字符串键）。
// xl:note `Object.create(null)` 那一档走的是另一条路（没有原型链可走）。
// xl:end
const proto: any = { p: 1 };
const o: any = Object.create(proto);
o.b = 2;
o["2"] = 3;
o.a = 4;
const keys: string[] = [];
for (const k in o) keys.push(k);
console.log("01", keys.join(","));
const arr = [10, 20];
(arr as any).extra = "x";
const ak: string[] = [];
for (const k in arr) ak.push(k);
console.log("02", ak.join(","));
const nullProto: any = Object.create(null);
nullProto.z = 1;
const nk: string[] = [];
for (const k in nullProto) nk.push(k);
console.log("03", nk.join(","));
console.log("04", Object.keys(o).join(","), Object.getOwnPropertyNames(o).join(","));
const shadow: any = Object.create(proto);
shadow.b = 9;
const sk: string[] = [];
for (const k in shadow) sk.push(k);
console.log("05", sk.join(","), shadow.b, shadow.p);
