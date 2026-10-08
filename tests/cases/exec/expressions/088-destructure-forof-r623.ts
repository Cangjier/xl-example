// xl:title for..of 里解构每一项（数组 / 对象）
// xl:round 623
// xl:judge stdout
// xl:end

for (const [k, v] of [["a", 1], ["b", 2]] as Array<[string, number]>) console.log(k, v);
for (const { x, y = 9 } of [{ x: 1 }, { x: 2, y: 3 }] as any[]) console.log(x, y);
