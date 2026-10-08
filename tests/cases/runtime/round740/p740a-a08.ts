// xl:title 一元前缀的结果再取成员 / 调用（括号那一档）
// xl:round 740
// xl:judge stdout
// xl:end
const o: any = { p: "abcdef" };
console.log((!o.p).toString(), (-o.p.length).toString());
console.log((typeof o.p).length, (void 0) === undefined);
console.log((!0).valueOf(), (!!1).valueOf());
