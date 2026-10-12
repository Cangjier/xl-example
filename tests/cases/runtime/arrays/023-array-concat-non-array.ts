// xl:title `concat` 把非数组项原样接上、把数组项摊开
// xl:round 305
// xl:judge stdout
// xl:end

const xs: any = [1, 2];
console.log(xs.concat(3, [4, 5], "6").join(","));
