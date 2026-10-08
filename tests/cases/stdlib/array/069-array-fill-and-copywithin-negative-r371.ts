// xl:title fill / copyWithin 的负下标与越界夹取
// xl:round 371
// xl:judge stdout
// xl:end
console.log(JSON.stringify([1, 2, 3, 4].fill(0, 1, 3)));
console.log(JSON.stringify([1, 2, 3, 4].fill(9, -2)));
console.log(JSON.stringify([1, 2, 3, 4, 5].copyWithin(0, 3)));
console.log(JSON.stringify([1, 2, 3, 4, 5].copyWithin(1, -2, -1)));
console.log(JSON.stringify([1, 2, 3].copyWithin(0, 10)));
