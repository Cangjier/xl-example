// xl:title `JSON.stringify` 里的 `undefined` / 函数 / 符号
// xl:round 736
// xl:judge stdout
// xl:end
console.log(JSON.stringify({ a: undefined, b: function () {}, c: 1 }));
console.log(JSON.stringify([undefined, function () {}, 1]));
const o: any = { a: 1 };
o[Symbol("s")] = 2;
console.log(JSON.stringify(o));
console.log(JSON.stringify(undefined), JSON.stringify(function () {}));
