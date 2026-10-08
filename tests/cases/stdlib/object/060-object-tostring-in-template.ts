// xl:title 普通对象进模板串给 `[object Object]`
// xl:round 305
// xl:judge stdout
// xl:end

console.log(`o=${({ a: 1 })}`, "x" + { a: 1 });
