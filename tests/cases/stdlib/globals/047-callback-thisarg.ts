// xl:title 回调的第二个实参 thisArg：map / filter / forEach / flatMap / 谓词族 / Array.from
// xl:round 647
// xl:judge stdout
// xl:end

const ctx = { k: 10, tag: "ctx" };
const xs = [1, 2, 3];
console.log(JSON.stringify(xs.map(function (v) { return v + this.k; }, ctx)));
console.log(JSON.stringify(xs.filter(function (v) { return v + this.k > 12; }, ctx)));
let seen = "";
xs.forEach(function (v) { seen += this.tag + v; }, ctx);
console.log(seen);
console.log(JSON.stringify(xs.flatMap(function (v) { return [v, this.k]; }, ctx)));
console.log(xs.some(function (v) { return v === this.k; }, ctx), xs.every(function (v) { return v < this.k; }, ctx));
console.log(xs.find(function (v) { return v === this.k; }, ctx), xs.findIndex(function (v) { return v === this.tag; }, ctx));
console.log(JSON.stringify(Array.from(xs, function (v) { return v * this.k; }, ctx)));
console.log(JSON.stringify(xs.map((v) => v * 2)));
