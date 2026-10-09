// xl:title 内建构造对象自己那一格原型：错误家族接 `Error`（收掉的那一半）
// xl:round 782
// xl:judge stdout
// xl:end
// 第 782 轮：**内建构造对象自己那一格原型**——`Object.getPrototypeOf(TypeError) === Error` 该是真的。
//
// 本仓的内建构造是「**普通对象 + 一格可调用载荷**」（第 145 轮），造它们的时候用的是
// `NewPlainObject` ⇒ 原型落在 `protos.Object` 上。JS 那边这一格是**有讲究的**：
// 错误家族的后代接的是**全局那一个 `Error` 对象**，而 `Error` 自己接的是 `Function.prototype`。
//
// 三个出口是**同一处根**：① `Object.getPrototypeOf(TypeError) === Error`
// （第 724 轮 `p724a-b01` 登的、第 781 轮 `r781a-01` 又量了一遍）；
// ② `Object.getPrototypeOf(Error) === Function.prototype`；③ `Error instanceof Function`。
// 本用例把三个出口与「**不许被带偏**」的那一半（`X.prototype` 那条链、自有格、
// 静态方法的相等、`Object.keys`、`toString` 的落点）一起钉住：
// 收①的时候顺手改坏②③是最容易发生的事。
//
// **同一条根的另一半没有收**（`Object` / `Array` / `Date` / `Map` 那些也接
// `Function.prototype`）——那几格写在 `r782a-02` 里：接上之后 `String(String)` 会走
// 继承来的 `Function.prototype.toString` ⇒ 从「响亮地抛」变成
// `"function () { [native code] }"`（**静默错值**，第 202 轮那两条判据钉着它）。
const P = (label: string, v: any): void => console.log(label + " = " + String(v));
const F: any = Function.prototype;

// —— 出口一：错误家族后代接全局那一个 `Error` ——
P("01 TypeError<-Error", Object.getPrototypeOf(TypeError) === Error);
P("02 RangeError<-Error", Object.getPrototypeOf(RangeError) === Error);
P("03 SyntaxError<-Error", Object.getPrototypeOf(SyntaxError) === Error);
P("04 ReferenceError<-Error", Object.getPrototypeOf(ReferenceError) === Error);
P("05 AggregateError<-Error", Object.getPrototypeOf(AggregateError) === Error);
P("06 URIError<-Error", Object.getPrototypeOf(URIError) === Error);
P("07 EvalError<-Error", Object.getPrototypeOf(EvalError) === Error);

// —— 出口二：`Error` 自己接 `Function.prototype`（错误家族的原型链因此经过它） ——
P("08 Error<-Function.prototype", Object.getPrototypeOf(Error) === F);
P("09 Error.call===Function.prototype.call", (Error as any).call === F.call);
P("10 TypeError.call===Function.prototype.call", (TypeError as any).call === F.call);
P("11 TypeError.bind===Function.prototype.bind", (TypeError as any).bind === F.bind);
P("12 Error 自己没有 call 那一格", Object.prototype.hasOwnProperty.call(Error, "call"));
P("13 TypeError 自己没有 call 那一格", Object.prototype.hasOwnProperty.call(TypeError, "call"));

// —— 出口三：`instanceof Function`（出口二的自然推论） ——
P("14 Error instanceof Function", (Error as any) instanceof Function);
P("15 TypeError instanceof Function", (TypeError as any) instanceof Function);
// **`Function` 自己那一格不在这里**：它是「自己的原型就是 `Function.prototype`」的特例，
// 接的是**另一个根**（本仓的全局 `Function` 对象与错误家族无关，收它要单独量）。

// —— **不许被带偏**的那一半 ——
// `X.prototype` 那一条链不该动：实例的原型还是各自那一个，`instanceof` 一个字不变。
P("17 TypeError.prototype<-Error.prototype", Object.getPrototypeOf(TypeError.prototype) === Error.prototype);
P("18 Error.prototype<-Object.prototype", Object.getPrototypeOf(Error.prototype) === Object.prototype);
P("19 new TypeError instanceof Error", new TypeError("t") instanceof Error);
P("20 new TypeError instanceof TypeError", new TypeError("t") instanceof TypeError);
P("21 t.constructor===TypeError", (new TypeError("t") as any).constructor === TypeError);
P("22 t.name", (new TypeError("t") as any).name);
// 自有格不该被这一趟弄丢或弄多。
P("23 Error.name 自有", Object.prototype.hasOwnProperty.call(Error, "name"));
P("24 Error.prototype 自有", Object.prototype.hasOwnProperty.call(Error, "prototype"));
P("25 Error.length", (Error as any).length);
P("26 AggregateError.length", (AggregateError as any).length);
P("27 Object.keys(Error)", Object.keys(Error).join(","));
// 静态方法的**相等**（`isError` / `captureStackTrace` 挂在 `Error` 自己身上，
// 后代是**继承**读到的：读得到、且是同一个值）。
P("28 TypeError.isError===Error.isError", (TypeError as any).isError === (Error as any).isError);
P("29 TypeError.captureStackTrace===Error.captureStackTrace",
  (TypeError as any).captureStackTrace === (Error as any).captureStackTrace);
P("30 Error.isError 类型", typeof (Error as any).isError);
P("31 TypeError.isError 类型", typeof (TypeError as any).isError);
// `Error.prototype.toString` 那一格仍在链的更前面（接上错误的原型之后不许被顶掉）。
P("32 String(new TypeError('t'))", String(new TypeError("t")));
P("33 Object.prototype.toString.call", Object.prototype.toString.call(new TypeError("t")));
// `Math` / `JSON` 那种**不是构造**的命名空间对象不该被这一趟带上 `Function.prototype`。
P("34 Math 的原型", Object.getPrototypeOf(Math) === Object.prototype);
P("35 JSON 的原型", Object.getPrototypeOf(JSON) === Object.prototype);
