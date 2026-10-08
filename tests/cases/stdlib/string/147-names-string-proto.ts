// xl:title 名字逐个取一次：String.prototype 的成员（第 718 轮后只剩正则那三个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why String.prototype 的成员：取到 undefined（node 上是 function）：match / matchAll / search。第 718 轮之前这一行有 19 个名字，其中 16 个是**同一族的两种代价**：anchor / big / blink / bold / fixed / fontcolor / fontsize / italics / link / small / strike / sub / sup 十三格只要字符串拼接（第 718 轮做出来了），trimLeft / trimRight 是 trimStart / trimEnd 的别名（同一轮），length 是那一格 0（同一轮）。**剩下这三个要 RegExp 整族**，与 `RegExp` 待做是同一件事，见 136 与 stdlib/string/probe703-s-e36 那一族。
// xl:end
const b: any = String.prototype;
let v = "";
v = "no";
try {
  v = String(typeof b["anchor"]);
} catch (err) {
}
console.log(typeof b, "anchor", v);
v = "no";
try {
  v = String(typeof b["big"]);
} catch (err) {
}
console.log(typeof b, "big", v);
v = "no";
try {
  v = String(typeof b["blink"]);
} catch (err) {
}
console.log(typeof b, "blink", v);
v = "no";
try {
  v = String(typeof b["bold"]);
} catch (err) {
}
console.log(typeof b, "bold", v);
v = "no";
try {
  v = String(typeof b["fixed"]);
} catch (err) {
}
console.log(typeof b, "fixed", v);
v = "no";
try {
  v = String(typeof b["fontcolor"]);
} catch (err) {
}
console.log(typeof b, "fontcolor", v);
v = "no";
try {
  v = String(typeof b["fontsize"]);
} catch (err) {
}
console.log(typeof b, "fontsize", v);
v = "no";
try {
  v = String(typeof b["italics"]);
} catch (err) {
}
console.log(typeof b, "italics", v);
v = "no";
try {
  v = String(typeof b["length"]);
} catch (err) {
}
console.log(typeof b, "length", v);
v = "no";
try {
  v = String(typeof b["link"]);
} catch (err) {
}
console.log(typeof b, "link", v);
v = "no";
try {
  v = String(typeof b["match"]);
} catch (err) {
}
console.log(typeof b, "match", v);
v = "no";
try {
  v = String(typeof b["matchAll"]);
} catch (err) {
}
console.log(typeof b, "matchAll", v);
v = "no";
try {
  v = String(typeof b["search"]);
} catch (err) {
}
console.log(typeof b, "search", v);
v = "no";
try {
  v = String(typeof b["small"]);
} catch (err) {
}
console.log(typeof b, "small", v);
v = "no";
try {
  v = String(typeof b["strike"]);
} catch (err) {
}
console.log(typeof b, "strike", v);
v = "no";
try {
  v = String(typeof b["sub"]);
} catch (err) {
}
console.log(typeof b, "sub", v);
v = "no";
try {
  v = String(typeof b["sup"]);
} catch (err) {
}
console.log(typeof b, "sup", v);
v = "no";
try {
  v = String(typeof b["trimLeft"]);
} catch (err) {
}
console.log(typeof b, "trimLeft", v);
v = "no";
try {
  v = String(typeof b["trimRight"]);
} catch (err) {
}
console.log(typeof b, "trimRight", v);
console.log("缺", 19, "个名字");
