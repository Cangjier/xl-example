// xl:title 无效日期的口径：Invalid Date / NaN / toISOString 抛
// xl:judge stdout
// xl:end

const d = new Date(NaN);
console.log(String(d), d.getTime(), Number.isNaN(d.getTime()));
try {
  d.toISOString();
} catch (e) {
  console.log((e as Error).name);
}
