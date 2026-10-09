// xl:title 其余内建构造自己那一格原型（`Function.prototype`）——同一条根的另一半
// xl:round 782
// xl:judge stdout
// xl:want differ
// xl:why 第 782 轮收掉了**错误家族**那一半（`Object.getPrototypeOf(TypeError) === Error` / `Error<-Function.prototype`，见 `r782a-01`），
// xl:why 而 `Object` / `Array` / `Number` / `String` / `Boolean` / `Symbol` / `Map` / `Set` / `WeakMap` /
// xl:why `WeakSet` / `Date` / `Promise` 这十二个**同一个形状**的对象接的还是 `protos.Object`
// xl:why （这一条实测：`Object.getPrototypeOf(Array) === Function.prototype` 在 Node 里为真、本仓为假，
// xl:why  连带 `Array instanceof Function` 也是假）。**它们的原型链该经过 `Function.prototype`**。
// xl:why **「接上去」这一步本身不难**：本仓的内建构造是「普通对象 + 一格可调用载荷」（第 145 轮），
// xl:why 而 `Function.prototype` 上那一格**取得到**——第 782 轮实测：错误家族接上之后
// xl:why `Error.call` / `TypeError.bind` 都命中 `Function.prototype` 上那一个（同一个句柄）。
// xl:why **难的是它带出来的那一格**：接上之后 `String(String)` 会走**继承来的**
// xl:why `Function.prototype.toString` ⇒ 从原来的「响亮地抛」变成 `"function () { [native code] }"`，
// xl:why 而 Node 给的是 `"function String() { [native code] }"`（**静默错值**，比抛坏得多）。
// xl:why 第 782 轮**试过整批接上去**，`tests/runtime/check.mjs` 当场红两条
// xl:why（`String(String)` 抛 / 「可调用对象那一档必须响亮地抛」），于是**退回到只接错误家族**。
// xl:why `globals.xl.md` 的 `ObjectTagOf` 那一段把这条账写在明处：
// xl:why **要收它得先做出「带可调用载荷的对象也有源码文本」**（每一格内建都要有一段自己的文本）。
// xl:why 下面这些行**照 JS 的答案写**（Node 全给真）：收那一半的那一轮，它们自己会转绿，
// xl:why 那时按规矩把这个文件头的 `xl:want` 与这几行 `xl:why` 撤掉。
// xl:end
const P = (label: string, v: any): void => console.log(label + " = " + String(v));
const F: any = Function.prototype;

// —— 十二格：对象自己那一格原型 ——
P("01 Object<-Function.prototype", Object.getPrototypeOf(Object) === F);
P("02 Array<-Function.prototype", Object.getPrototypeOf(Array) === F);
P("03 Number<-Function.prototype", Object.getPrototypeOf(Number) === F);
P("04 String<-Function.prototype", Object.getPrototypeOf(String) === F);
P("05 Boolean<-Function.prototype", Object.getPrototypeOf(Boolean) === F);
P("06 Symbol<-Function.prototype", Object.getPrototypeOf(Symbol) === F);
P("07 Map<-Function.prototype", Object.getPrototypeOf(Map) === F);
P("08 Set<-Function.prototype", Object.getPrototypeOf(Set) === F);
P("09 WeakMap<-Function.prototype", Object.getPrototypeOf(WeakMap) === F);
P("10 WeakSet<-Function.prototype", Object.getPrototypeOf(WeakSet) === F);
P("11 Date<-Function.prototype", Object.getPrototypeOf(Date) === F);
P("12 Promise<-Function.prototype", Object.getPrototypeOf(Promise) === F);

// —— 同一句话的第二个出口：`instanceof Function` ——
P("13 Object instanceof Function", (Object as any) instanceof Function);
P("14 Array instanceof Function", (Array as any) instanceof Function);
P("15 Number instanceof Function", (Number as any) instanceof Function);
P("16 Date instanceof Function", (Date as any) instanceof Function);
P("17 Map instanceof Function", (Map as any) instanceof Function);
P("18 Promise instanceof Function", (Promise as any) instanceof Function);

// —— 第三个出口：`Function.prototype` 上那两格该取得到（与错误家族同一个式子） ——
P("19 Array.call===Function.prototype.call", (Array as any).call === F.call);
P("20 Date.bind===Function.prototype.bind", (Date as any).bind === F.bind);

// —— **不许被带偏**：各自 `prototype` 那一条链与 `constructor` 一个都不许动 ——
// （这五行今天就是对的：收上面那一半时它们必须仍然对。）
P("21 Array.prototype<-Object.prototype", Object.getPrototypeOf(Array.prototype) === Object.prototype);
P("22 [] instanceof Array", [] instanceof Array);
P("23 [].constructor===Array", ([] as any).constructor === Array);
P("24 (new Date()).constructor===Date", (new Date() as any).constructor === Date);
P("25 Array.isArray([])", Array.isArray([]));
