// xl:title 访问器描述符与「读写不对称」：get 建不出、set 建得出、遮蔽与 delete
// xl:round 778
// xl:judge stdout
// xl:end
// 第 778 轮普查面：`getOwnPropertyDescriptor` / `defineProperty` 与访问器那一族
// ——只给 `get` 的描述符**不能**让一个普通数据属性变成访问器（V8 要求 configurable），
// 只给 `set` 的可以；继承来的访问器被自有数据属性遮蔽之后写的是自有那一格；
// 原型上的访问器被删掉就露不出来了。这一条把这几档钉住。
const show = (v: any): string => (typeof v === "string" ? JSON.stringify(v) : String(v));
const d = (o: any, k: any): any => Object.getOwnPropertyDescriptor(o, k);
console.log('01 只给 get 建不出', show((() => { const o: any = {}; try { Object.defineProperty(o, "x", { get: () => 1 }); } catch (e: any) { return "throw:" + e.constructor.name; } return show(o.x); })()));
console.log('02 只给 set 建得出', show((() => { const o: any = {}; Object.defineProperty(o, "x", { set: (v: any) => { o.v = v; } }); o.x = 2; return o.v; })()));
console.log('03 configurable 就能改', show((() => { const o: any = {}; Object.defineProperty(o, "x", { value: 4, configurable: true }); Object.defineProperty(o, "x", { get: () => 5 }); return o.x; })()));
console.log('04 描述符三档：数据', show((() => { const o: any = { a: 1 }; const x = d(o, "a"); return [x.value, x.writable, x.enumerable, x.configurable, "get" in x].join(","); })()));
console.log('04b 对象字面量的访问器是 configurable', show(d({ get a() { return 1; } }, "a").configurable));
console.log('05 描述符三档：访问器', show((() => { const o: any = { get a() { return 1; }, set a(v: any) { void v; } }; const x = d(o, "a"); return [typeof x.get, typeof x.set, "value" in x].join(","); })()));
console.log('06 数组的 length 描述符', show((() => { const x = d([1, 2, 3], "length"); return [x.value, x.writable, x.enumerable, x.configurable].join(","); })()));
console.log('07 字符串自己的下标那一格', show((() => { const x = d("ab" as any, 0); return [x.value, x.writable, x.enumerable, x.configurable].join(","); })()));
console.log('08 数组不存在的下标', show(typeof d([1], 5)));
// **原型上只有 get 时，赋值一声不响**（没有 setter ⇒ 那一格写不下去，
// 也就**不会**在自有属性里多出一格来遮蔽它）⇒ 读回来的仍是原型那一格。
console.log('09 只有 get 时赋值写不进自有', show((() => { const p: any = { get v() { return "proto"; } }; const o: any = Object.create(p); o.v = "own"; return [o.v, Object.prototype.hasOwnProperty.call(o, "v")].join(","); })()));
// 有 setter 时才写进自有那一格（`Object.create` 的道具对象是**松散模式**的，
// 所以 `o.v = "own"` 走的是 setter、不是自有数据属性）。
console.log('09b 有 setter 时赋值走 setter', show((() => { const p: any = { _v: "proto", get v() { return this._v; }, set v(x: any) { this._v = x; } }; const o: any = Object.create(p); o.v = "own"; return [o.v, o._v, Object.prototype.hasOwnProperty.call(o, "_v")].join(","); })()));
console.log('10 delete 自有之后露回原型那格', show((() => { const p: any = { get v() { return "proto"; } }; const o: any = Object.create(p); o.own = "own"; delete o.own; return o.v; })()));
console.log('11 defineProperty 覆盖继承访问器', show((() => { const p: any = { get v() { return "proto"; } }; const o: any = Object.create(p); Object.defineProperty(o, "v", { value: "d", configurable: true }); return o.v; })()));
console.log('12 描述符里的 get 就是原型上那个函数', show((() => { const p: any = { get v() { return 1; } }; const o: any = Object.create(p); return d(p, "v").get === d(p, "v").get; })()));
console.log('13 Object.create 带描述符', show((() => { const o: any = Object.create(Object.prototype, { v: { value: 7, enumerable: true } }); return [o.v, Object.keys(o).join(",")].join(" "); })()));
console.log('14 不可写的自有属性', show((() => { const o: any = {}; Object.defineProperty(o, "v", { value: 8, writable: false }); o.v = 9; return o.v; })()));
console.log('15 不可配置的 delete', show((() => { const o: any = {}; Object.defineProperty(o, "v", { value: 1, configurable: false }); return show(delete o.v) + ":" + show(o.v); })()));
console.log('16 getOwnPropertyNames 与 keys 的差', show((() => { const o: any = {}; Object.defineProperty(o, "hidden", { value: 1 }); o.shown = 2; return Object.getOwnPropertyNames(o).join(",") + " / " + Object.keys(o).join(","); })()));
console.log('17 数组自己那几格名字', show(Object.getOwnPropertyNames([1, 2]).join(",")));
