// xl:title 十三个 HTML 包装各自的那一句
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "a".anchor("n")));
console.log(t(() => "a".big()));
console.log(t(() => "a".blink()));
console.log(t(() => "a".bold()));
console.log(t(() => "a".fixed()));
console.log(t(() => "a".fontcolor("red")));
console.log(t(() => "a".fontsize(4)));
console.log(t(() => "a".italics()));
console.log(t(() => "a".link("u")));
console.log(t(() => "a".small()));
console.log(t(() => "a".strike()));
console.log(t(() => "a".sub()));
console.log(t(() => "a".sup()));
