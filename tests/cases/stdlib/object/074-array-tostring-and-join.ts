// xl:title `join` / `toString` 的每一格走它自己的 `toString`
// xl:round 338
// xl:judge stdout
// xl:end

const custom = { toString() { return "C!"; } };
const nested = [1, [2, 3]];
console.log([custom, 1].join("|"), [custom, 1].toString(), String([custom]));
console.log(nested.join("-"), nested.toString(), String(nested));
console.log([null, undefined, true].join(","), [1, , 3].join("-"));
class Box { toString() { return "box"; } }
console.log([new Box(), "x"].join("+"));
