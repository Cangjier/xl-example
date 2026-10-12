// xl:title globalThis 指向那个环境对象自己
// xl:judge stdout
// xl:end

console.log(globalThis.Math === Math, globalThis.JSON === JSON, typeof globalThis);
console.log(globalThis.undefined === undefined, globalThis.NaN === NaN);
