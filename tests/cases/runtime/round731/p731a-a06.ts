// xl:title `Object.getOwnPropertyDescriptor(f, "length"|"name")`
// xl:round 731
// xl:judge stdout
// xl:end
function f(a: number, b: number) {}
const d = Object.getOwnPropertyDescriptor(f, "length") as any;
console.log(d === undefined ? "undefined" : d.value + "|" + d.writable + "|" + d.enumerable + "|" + d.configurable);
const n = Object.getOwnPropertyDescriptor(f, "name") as any;
console.log(n === undefined ? "undefined" : JSON.stringify(n.value) + "|" + n.writable + "|" + n.enumerable);
