// xl:title 稀疏数组：`JSON.stringify` 把洞写成 null，`1 in xs` 是假
// xl:round 305
// xl:judge stdout
// xl:end

const xs: any[] = [1, , 3];
console.log(JSON.stringify(xs), xs.length, 1 in xs);
