// xl:title 内建构造对象自己那一格原型：错误家族接 `Error`、其余接 `Function.prototype`
// xl:round 782
// xl:judge stdout
// xl:end
// 第 782 轮：**内建构造对象自己那一格原型**——`Object.getPrototypeOf(TypeError) === Error` 该是真的。
//
// 本仓的内建构造是「**普通对象 + 一格可调用载荷**」（第 145 轮），造它们的时候用的是
// `NewPlainObject` ⇒ 原型落在 `protos.Object` 上。JS 那边这一格是**有讲究的**：
// 错误家族的后代接的是**全局那一个 `Error` 对象**、其余内建构造接的是 `Function.prototype`
// （所以 `Error instanceof Function` 也是真）。
//
// 三个出口是**同一处根**：① `Object.getPrototypeOf(TypeError) === Error`
// （第 724 轮 `p724a-b01` 登的、第 781 轮 `r781a-01` 又量了一遍）；
// ② `Object.getPrototypeOf(Error) === Function.prototype`；③ `Error instanceof Function`。
// 本用例把三个出口与「**不许被带偏**」的那一半（`X.prototype` 那条链、自有格、
// 静态方法的相等、`Object.keys`）一起钉住：收①的时候顺手改坏②③是最容易发生的事。
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

// —— 出口二：其余内建构造接 `Function.prototype` ——
P("08 Error<-Function.prototype", Object.getPrototypeOf(Error) === F);
P("09 Object<-Function.prototype", Object.getPrototypeOf(Object) === F);
P("10 Array<-Function.prototype", Object.getPrototypeOf(Array) === F);
P("11 Number<-Function.prototype", Object.getPrototypeOf(Number) === F);
P("12 String<-Function.prototype", Object.getPrototypeOf(String) === F);
P("13 Boolean<-Function.prototype", Object.getPrototypeOf(Boolean) === F);
P("14 Symbol<-Function.prototype", Object.getPrototypeOf(Symbol) === F);
P("15 Map<-Function.prototype", Object.getPrototypeOf(Map) === F);
P("16 Set<-Function.prototype", Object.getPrototypeOf(Set) === F);
P("17 WeakMap<-Function.prototype", Object.getPrototypeOf(WeakMap) === F);
P("18 WeakSet<-Function.prototype", Object.getPrototypeOf(WeakSet) === F);
P("19 Date<-Function.prototype", Object.getPrototypeOf(Date) === F);
P("20 Promise<-Function.prototype", Object.getPrototypeOf(Promise) === F);
P("21 Function<-Function.prototype", Object.getPrototypeOf(Function) === F);

// —— 出口三：`instanceof Function`（出口二的自然推论） ——
P("22 Error instanceof Function", (Error as any) instanceof Function);
P("23 TypeError instanceof Function", (TypeError as any) instanceof Function);
P("24 Object instanceof Function", (Object as any) instanceof Function);
P("25 Function instanceof Function", (Function as any) instanceof Function);
P("26 Map instanceof Function", (Map as any) instanceof Function);

// —— 原型的静态是**继承来的那一格**（不是自己新挂的一个） ——
P("27 Error.call===Function.prototype.call", (Error as any).call === F.call);
P("28 TypeError.call===Function.prototype.call", (TypeError as any).call === F.call);
P("29 TypeError.bind===Function.prototype.bind", (TypeError as any).bind === F.bind);
P("30 TypeError.hasOwnProperty('call')", Object.prototype.hasOwnProperty.call(TypeError, "call"));

// —— **不许被带偏**的那一半 ——
// `X.prototype` 那一条链不该动：实例的原型还是各自那一个，`instanceof` 一个字不变。
P("31 TypeError.prototype<-Error.prototype", Object.getPrototypeOf(TypeError.prototype) === Error.prototype);
P("32 Error.prototype<-Object.prototype", Object.getPrototypeOf(Error.prototype) === Object.prototype);
P("33 new TypeError instanceof Error", new TypeError("t") instanceof Error);
P("34 new TypeError instanceof TypeError", new TypeError("t") instanceof TypeError);
P("35 t.constructor===TypeError", (new TypeError("t") as any).constructor === TypeError);
P("36 t.name", (new TypeError("t") as any).name);
// 自有格不该被这一趟弄丢或弄多。
P("37 Error.name 自有", Object.prototype.hasOwnProperty.call(Error, "name"));
P("38 Error.prototype 自有", Object.prototype.hasOwnProperty.call(Error, "prototype"));
P("39 Error.length", (Error as any).length);
P("40 AggregateError.length", (AggregateError as any).length);
P("41 Object.keys(Error)", Object.keys(Error).join(","));
// 静态方法的**相等**（`isError` / `captureStackTrace` 挂在 `Error` 自己身上，
// 后代是**继承**读到的：读得到、且是同一个值）。
P("42 TypeError.isError===Error.isError", (TypeError as any).isError === (Error as any).isError);
P("43 TypeError.captureStackTrace===Error.captureStackTrace",
  (TypeError as any).captureStackTrace === (Error as any).captureStackTrace);
P("44 Error.isError 类型", typeof (Error as any).isError);
P("45 TypeError.isError 类型", typeof (TypeError as any).isError);
P("46 Promise.all.name", (Promise as any).all.name);
P("47 Math 的原型", Object.getPrototypeOf(Math) === Object.prototype);
P("48 JSON 的原型", Object.getPrototypeOf(JSON) === Object.prototype);
