// xl:title `-0` / `Infinity` / `NaN` 在网络里怎么打
// xl:round 691
// xl:judge stdout
// xl:end
console.log(-0, 0, Infinity, -Infinity, NaN);
console.log([-0, NaN]);
console.log({ n: -0 });
