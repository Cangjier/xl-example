// xl:title 对象字面量的语义边角：重复键、`__proto__`、计算键与次序
// xl:round 778
// xl:judge stdout
// xl:end
// 第 778 轮第二普查面：对象字面量。这一族在语料里很多，但下面这几档各自只有一处
// 语义要点、都还没被问过：**重复键谁赢**（后者覆盖前者，但位置留在**第一次**出现的地方）、
// **`__proto__:` 是原型设置器**（不是普通属性，且只在字面量里有这个特权）、
// **计算键**（`[expr]` 走 `ToPropertyKey`）、以及 `Object.keys` 的**次序规则**
// （整数键升序在前、其余按插入序）。
//
// **计算键里放一个对象**是**另一条缺口**（`define_data` 那一格对对象响亮地抛），
// 所以这一条第 05 行用的是**字符串化的对象**那一半够不着的写法——
// 对象键那一格在 `stdlib/round778b/r778j-02` 单独登记着。
const show = (v: any): string => (v === null ? "null" : typeof v === "string" ? JSON.stringify(v) : String(v));
const run = (f: () => any): string => { try { return show(f()); } catch (e: any) { return "throw:" + e.constructor.name; } };
console.log('01 重复键后者赢、次序留在第一次', run(() => {
  const o: any = { a: 1, b: 2, a: 3 };
  return Object.keys(o).join(",") + "|" + o.a;
}));
console.log('02 方法覆盖同名数据属性', run(() => {
  const o: any = { m: 1, m() { return 2; } };
  return typeof o.m;
}));
console.log('03 __proto__ 冒号是原型设置器', run(() => {
  const proto: any = { p: 1 };
  const o: any = { __proto__: proto, own: 2 };
  return [o.p, Object.keys(o).join(","), Object.getPrototypeOf(o) === proto, Object.prototype.hasOwnProperty.call(o, "__proto__")].join("|");
}));
console.log('04 Object.defineProperty 里的 __proto__ 是普通键', run(() => {
  const o: any = {};
  Object.defineProperty(o, "__proto__", { value: 5, enumerable: true, configurable: true });
  return [o.__proto__, typeof o.__proto__, Object.getPrototypeOf(o) === Object.prototype].join("|");
}));
console.log('05 计算键：字符串 / 数字 / 符号三档', run(() => {
  const o: any = { ["s"]: 1, [1 + 1]: 2, [Symbol.iterator]: 3 };
  return [o.s, o["2"], o[Symbol.iterator], Object.keys(o).join(",")].join("|");
}));
console.log('06 键的次序：整数升序在前', run(() => {
  const o: any = { b: 1, 2: 2, a: 3, 1: 4, 10: 5 };
  return Object.keys(o).join(",");
}));
console.log('07 负零与数字键的归一', run(() => {
  const o: any = { [-0]: "z", [1.5]: "f", [1e21]: "big" };
  return Object.keys(o).join(",");
}));
console.log('08 属性位里的函数取名、计算键不取名', run(() => {
  const name = "n";
  const o: any = { [name]: function () { return 1; }, plain: function () { return 2; } };
  return [o.n.name, o.plain.name].join("|");
}));
console.log('09 字面量里的 getter/setter 配对', run(() => {
  const store: string[] = [];
  const o: any = { set v(x: any) { store.push("s:" + x); }, get v() { store.push("g"); return store.length; } };
  o.v = 1;
  o.v = 2;
  return [o.v, store.join(",")].join("|");
}));
console.log('10 展开复制自身可枚举属性', run(() => {
  const src: any = {};
  Object.defineProperty(src, "hidden", { value: 1, enumerable: false });
  src.shown = 2;
  const copy: any = { ...src };
  return [Object.keys(copy).join(","), copy.hidden, "hidden" in copy].join("|");
}));
console.log('11 展开会调 getter', run(() => {
  let calls = 0;
  const src: any = { get g() { calls += 1; return 3; } };
  const copy: any = { ...src };
  return [copy.g, calls].join("|");
}));
console.log('12 展开 null / undefined 给空对象', run(() => Object.keys({ ...(null as any), ...(undefined as any) }).length));
console.log('13 字面量末尾的逗号与空位', run(() => {
  const o: any = { a: 1, };
  const arr = [1, 2, ];
  return [Object.keys(o).join(","), arr.length].join("|");
}));
console.log('14 括号里的对象字面量与块', run(() => {
  const o: any = ({ a: 1 });
  return o.a;
}));
console.log('15 逗号运算符与对象', run(() => {
  const o: any = (0, { z: 9 });
  return o.z;
}));
console.log('16 方法里的 super 指向原型', run(() => {
  const proto: any = { greet() { return "proto"; } };
  const o: any = { __proto__: proto, greet() { return "own+" + super.greet(); } };
  return o.greet();
}));
