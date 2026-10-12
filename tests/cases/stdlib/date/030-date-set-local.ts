// xl:title Date.setHours / setMinutes / setSeconds / setMilliseconds
// xl:round 623
// xl:judge stdout
// xl:end

const d = new Date(2020, 0, 2, 3, 4, 5, 6);
d.setHours(10);
d.setMinutes(11);
d.setSeconds(12);
d.setMilliseconds(13);
console.log(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
