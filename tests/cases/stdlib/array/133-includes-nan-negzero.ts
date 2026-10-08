// xl:title `includes` 认 `NaN`、`indexOf` 不认；`-0` 两处都算 `0`
// xl:round 691
// xl:judge stdout
// xl:end
console.log([NaN].includes(NaN), [NaN].indexOf(NaN));
console.log([-0].indexOf(0), [-0].includes(0));
console.log([0].indexOf(-0), [0].includes(-0));
