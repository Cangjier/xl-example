// xl:title delete 数组元素留洞
// xl:round 692
// xl:judge stdout
// xl:end

const a = [1, 2, 3];
delete a[1];
console.log(a.length, 1 in a, a.join(","));
