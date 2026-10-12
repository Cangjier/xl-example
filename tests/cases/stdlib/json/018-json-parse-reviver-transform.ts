// xl:title JSON.parse 的 reviver：改值与丢键
// xl:round 291
// xl:judge stdout
// xl:end

const v = JSON.parse('{"n":1,"o":{"n":2}}', (k, val) => (typeof val === "number" ? val * 10 : val));
console.log(JSON.stringify(v));
const dropped = JSON.parse('{"a":1,"b":2}', (k, val) => (k === "b" ? undefined : val));
console.log(JSON.stringify(dropped));
