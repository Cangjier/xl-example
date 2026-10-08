// xl:title catch 形参与 for 头部里的类型标注
// xl:round 304
// xl:judge stdout
// xl:end

const rows: Array<{ id: number }> = [{ id: 1 }, { id: 2 }];
let sum: number = 0;
for (const row of rows as Array<{ id: number }>) sum += row.id;
for (let i: number = 0; i < 2; i++) sum += i;
for (const k in { a: 1, b: 2 }) sum += k.length;
try {
  throw new TypeError("t");
} catch (e: unknown) {
  sum += (e as Error).message.length;
}
console.log(sum);
