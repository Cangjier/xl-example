// xl:title 标签模板：成员与可选调用的被调者
// xl:round 749
// xl:judge stdout
// xl:end
const obj = { tag(strings: any, ...v: any[]) { return "M:" + strings.join("_") + v.join(","); } };
console.log(obj.tag`x${1}y`);
console.log((obj.tag as any)`z`);
const maybe: any = { tag: (s: any, ...v: any[]) => "O:" + s.length + v.length };
console.log(maybe.tag`p${1}`);
const none: any = {};
try { console.log(none.tag`q`); } catch (e) { console.log("throw", (e as Error).constructor.name); }
