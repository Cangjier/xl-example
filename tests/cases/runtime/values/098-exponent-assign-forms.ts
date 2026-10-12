// xl:title `**` 与 `**=`：右结合、与一元负号的关系
// xl:round 304
// xl:judge stdout
// xl:end

let n = 2;
n **= 3;
console.log(n, 2 ** 3 ** 2, (-2) ** 2, 2 ** -1);
console.log((2 ** 0.5).toFixed(4));
