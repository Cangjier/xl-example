// xl:title `===`：不做转换、跨类型一律假
// xl:judge stdout
// xl:end

console.log(1 === 1, 1 === "1", null === null, undefined === undefined);
console.log(null === undefined, 0 === -0, NaN === NaN, true === 1);
