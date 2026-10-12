// xl:title 数组的形状：delete 留洞、length 写大留洞、写小截断，遍历跳过洞
// xl:round 7
// xl:judge stdout
// xl:end

const xs: any[] = [1, 2, 3, 4];
delete xs[1];
console.log(xs.length, 1 in xs, xs.join(","), JSON.stringify(xs));
xs.length = 2;
console.log(xs.length, xs.join(","));
xs.length = 5;
console.log(xs.length, xs[4], Object.keys(xs).join(","));
