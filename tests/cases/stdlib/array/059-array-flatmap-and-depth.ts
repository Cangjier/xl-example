// xl:title `flatMap` 只摊一层
// xl:round 305
// xl:judge stdout
// xl:end

console.log([[1], [2, 3]].flatMap((x) => x).join(","), [[[1]], [[2]]].flatMap((x) => x).length);
