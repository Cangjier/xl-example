// xl:title JSON.stringify 的 replacer 与 JSON.parse 的 reviver
// xl:round 676
// xl:judge stdout
// xl:end

const o = { a: 1, b: "x", c: [1, 2] };
console.log(JSON.stringify(o, ["a", "c"]));
console.log(JSON.stringify(o, (k: string, v: any) => (typeof v === "number" ? v * 2 : v)));
const back = JSON.parse('{"n":1,"s":"y"}', (k: string, v: any) => (typeof v === "string" ? v + "!" : v));
console.log(JSON.stringify(back));
