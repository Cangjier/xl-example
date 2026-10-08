// xl:title 箭头与常规函数那一档没被带偏（`@@toStringTag` 问过之后再答 `Function`）
// xl:round 730
// xl:judge stdout
// xl:end
console.log((() => {}).constructor.name, (function () {}).constructor.name, (async () => {}).constructor.name);
console.log(Object.prototype.toString.call(() => {}), Object.prototype.toString.call(function () {}));
console.log(Object.prototype.toString.call(function* () {}), Object.prototype.toString.call(Promise.resolve(1)));
