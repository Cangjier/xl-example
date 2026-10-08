// xl:title `RegExp` 那一族现在的样子（口径内该做）
// xl:round 691
// xl:judge stdout
// xl:want blocked
// xl:why `RegExp` 字面量还没实现（`unimplemented: expression RegularExpressionLiteral`）。要做。
// xl:end
const r: any = /a(b)c/;
console.log(r.source, r.flags, r.test("xabcx"));
console.log("a1b2".replace(/\d/g, "#"));
console.log(JSON.stringify("a1b2".split(/\d/)));
