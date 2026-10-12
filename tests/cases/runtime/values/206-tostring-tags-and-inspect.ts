// xl:title Symbol.toStringTag 与内建对象的标签
// xl:round 371
// xl:judge stdout
// xl:end
class Custom { get [Symbol.toStringTag]() { return "Custom"; } }
const objs: [string, unknown][] = [["obj", {}], ["arr", []], ["fn", () => 0], ["map", new Map()], ["set", new Set()], ["date", new Date(0)], ["err", new Error("e")], ["custom", new Custom()], ["promise", Promise.resolve(1)]];
for (const [name, v] of objs) console.log(name, Object.prototype.toString.call(v));
console.log(Object.prototype.toString.call(null), Object.prototype.toString.call(undefined));
console.log(String(new Custom()), `${new Custom()}`);
