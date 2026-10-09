// xl:title 错误对象的枚举键与 name 的可写性
// xl:round 371
// xl:judge stdout
// xl:end
const e = new Error("boom");
console.log(Object.keys(e).join(","), e.message, e.name);
e.name = "Custom";
console.log(e.name, String(e));
console.log(JSON.stringify({ err: new Error("x") }));
console.log(e.propertyIsEnumerable("message"), e.propertyIsEnumerable("name"));
