// xl:title 迭代器助手的三个名字在不在（第 725 轮新铺的）
// xl:round 725
// xl:judge stdout
// xl:end
const it: any = [1, 2, 3, 4].values();
console.log(typeof it.take, typeof it.drop, typeof it.toArray);
console.log([...it.take(2)].join(","));
const it2: any = [1, 2, 3, 4].values();
console.log([...it2.drop(2)].join(","));
const it3: any = [1, 2, 3].values();
console.log(it3.toArray().join(","));
