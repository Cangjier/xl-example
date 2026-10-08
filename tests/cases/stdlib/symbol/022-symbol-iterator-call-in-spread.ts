// xl:title 展开位里「取 `Symbol.iterator` 再调」——`()` 会逃出展开
// xl:round 308
// xl:judge stdout
// xl:end

const a: any = [10, 20];
console.log([...a[Symbol.iterator]()].join(","));
