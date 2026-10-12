// xl:title 数组自己带 `toJSON` 时 `JSON.stringify` 先问它
// xl:round 305
// xl:judge stdout
// xl:end

const arr: any = [1, 2];
arr.toJSON = () => "custom";
console.log(JSON.stringify(arr), JSON.stringify({ arr }));
