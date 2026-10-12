// xl:title 改 length：变长留洞、变短截断
// xl:round 304
// xl:judge stdout
// xl:end

const xs = [1, 2, 3];
xs.length = 5;
console.log(xs.length, xs[3], JSON.stringify(xs));
xs.length = 1;
console.log(xs.length, JSON.stringify(xs), xs[5]);
