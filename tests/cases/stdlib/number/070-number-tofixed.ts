// xl:title `toFixed` 的进位与 `toPrecision`
// xl:round 691
// xl:judge stdout
// xl:end
console.log((1.005).toFixed(2), (2.5).toFixed(0), (-0).toFixed(0));
console.log((123.456).toPrecision(4), (0.000123).toPrecision(2));
console.log((1e21).toFixed(0));
