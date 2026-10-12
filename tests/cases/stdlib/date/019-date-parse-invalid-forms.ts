// xl:title `Date.parse` 的几种非 ISO 输入给 NaN
// xl:round 305
// xl:judge stdout
// xl:end

console.log(Date.parse("2021-03-04"), Date.parse("2021-03-04T05:06:07Z"), Number.isNaN(Date.parse("nope")));
