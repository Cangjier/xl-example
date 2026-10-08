// xl:title 数组的洞：in 是假、join 空、JSON 变 null
// xl:judge stdout
// xl:end

const xs: any[] = [1, , 3];
console.log(1 in xs, 0 in xs, xs.length, xs.join("|"), JSON.stringify(xs));
