// xl:title in 能不能问 symbol 键；字符串键与 symbol 键分不分家
// xl:round 678
// xl:judge stdout
// xl:end

const s = Symbol("k");
const o: any = { [s]: 1, plain: 2 };
console.log(s in o, "plain" in o, "missing" in o);
const o2: any = { plain: 2 };
console.log(s in o2);
