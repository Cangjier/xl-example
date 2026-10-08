// xl:title `Promise.all([])` 与 `Promise.race` 的空实参
// xl:round 305
// xl:judge stdout
// xl:end

Promise.all([]).then((xs) => console.log("all", JSON.stringify(xs)));
console.log("sync");
