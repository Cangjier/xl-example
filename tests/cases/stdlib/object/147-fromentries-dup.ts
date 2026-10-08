// xl:title `fromEntries` 重复键取最后一条
// xl:round 691
// xl:judge stdout
// xl:end
console.log(JSON.stringify(Object.fromEntries([["a", 1], ["a", 2]])));
