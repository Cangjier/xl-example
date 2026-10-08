// xl:title `reduce` / `reduceRight` 空数组无初值：错误族与消息逐字
// xl:round 745
// xl:judge stdout
// xl:end
try {
  ([] as number[]).reduce((a, b) => a + b);
} catch (e) {
  console.log((e as Error).constructor.name, JSON.stringify((e as Error).message));
}
try {
  ([] as number[]).reduceRight((a, b) => a + b);
} catch (e) {
  console.log((e as Error).constructor.name, JSON.stringify((e as Error).message));
}
console.log("done");
