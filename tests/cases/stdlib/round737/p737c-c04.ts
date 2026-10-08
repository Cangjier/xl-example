// xl:title `Symbol.iterator` 与 `Symbol.asyncIterator` 在两个环上的落点
// xl:round 737
// xl:judge stdout
// xl:end
console.log(typeof [] [Symbol.iterator], typeof "" [Symbol.iterator], typeof new Map()[Symbol.iterator]);
console.log(typeof (async function* () {})()[Symbol.asyncIterator]);
console.log(typeof (async function* () {})()[Symbol.iterator]);
async function* g() { yield 1; }
const it: any = g();
console.log(typeof it.next, typeof it.return, typeof it.throw);
