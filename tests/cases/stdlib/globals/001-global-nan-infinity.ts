// xl:title NaN / Infinity / undefined 是全局上的只读属性
// xl:judge stdout
// xl:end

console.log(NaN === NaN, Infinity > 1e308, -Infinity < -1e308, typeof undefined);
console.log(globalThis.NaN === NaN, globalThis.Infinity > 0, globalThis.undefined === undefined);
