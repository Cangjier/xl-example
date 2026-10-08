// xl:title 数组 join / toString 遇到洞、null、嵌套
// xl:round 304
// xl:judge stdout
// xl:end

const xs: any[] = [1, , 3, null, undefined, [4, 5], { a: 1 }];
console.log(xs.join("|"));
console.log(String(xs) === xs.join(","), [].join("|") + "|", [null].join("|") + "|");
