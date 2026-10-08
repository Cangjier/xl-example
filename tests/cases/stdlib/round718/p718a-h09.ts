// xl:title 十三个名字在原型上都是函数
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const names = ["anchor", "big", "blink", "bold", "fixed", "fontcolor", "fontsize",
  "italics", "link", "small", "strike", "sub", "sup"];
console.log(names.map((k) => typeof (String.prototype as any)[k]).join(","));
