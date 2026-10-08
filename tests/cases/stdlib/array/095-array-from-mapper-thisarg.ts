// xl:title Array.from 的 mapper 与第三个实参 thisArg
// xl:round 647
// xl:judge stdout
// xl:end

const ctx = { k: 10 };
const out = Array.from([1, 2], function (v) { return v + this.k; }, ctx);
console.log(JSON.stringify(out));
console.log(JSON.stringify(Array.from("abc")), JSON.stringify(Array.from(new Set([1, 1, 2]))));
console.log(JSON.stringify(Array.from({ length: 3 }, (_, i) => i * 2)));
