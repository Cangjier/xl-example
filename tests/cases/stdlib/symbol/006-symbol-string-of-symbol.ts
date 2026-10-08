// xl:title `String(符号)` 是一条**特例**（给 `"Symbol(描述)"`，不走 ToPrimitive）
// xl:judge stdout
// xl:end

console.log(String(Symbol.iterator) === "Symbol(Symbol.iterator)");
console.log(String(Symbol("s")), String(Symbol()), String(Symbol.iterator).length > 0);
