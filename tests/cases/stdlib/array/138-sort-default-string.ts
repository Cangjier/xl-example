// xl:title 默认比较器把元素转成字符串比较
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [10, 9, 100, 1];
console.log(JSON.stringify(a.sort()));
console.log(JSON.stringify([3, 1, 2].sort((x: any, y: any) => y - x)));
console.log(JSON.stringify(["b", "a", "C"].sort()));
