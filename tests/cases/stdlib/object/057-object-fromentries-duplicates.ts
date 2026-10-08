// xl:title `Object.fromEntries` 遇到重复键：最后一个赢
// xl:round 305
// xl:judge stdout
// xl:end

console.log(JSON.stringify(Object.fromEntries([["a", 1], ["b", 2], ["a", 3]])));
