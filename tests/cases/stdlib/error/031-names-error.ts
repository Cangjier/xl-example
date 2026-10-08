// xl:title 名字逐个取一次：Error 的静态成员（缺 4 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why Error 的静态成员：取到 undefined（node 上是 function/number）：captureStackTrace / length / prepareStackTrace / stackTraceLimit
// xl:end
const b: any = Error;
let v = "";
v = "no";
try {
  v = String(typeof b["captureStackTrace"]);
} catch (err) {
}
console.log(typeof b, "captureStackTrace", v);
v = "no";
try {
  v = String(typeof b["length"]);
} catch (err) {
}
console.log(typeof b, "length", v);
v = "no";
try {
  v = String(typeof b["prepareStackTrace"]);
} catch (err) {
}
console.log(typeof b, "prepareStackTrace", v);
v = "no";
try {
  v = String(typeof b["stackTraceLimit"]);
} catch (err) {
}
console.log(typeof b, "stackTraceLimit", v);
console.log("缺", 4, "个名字");
