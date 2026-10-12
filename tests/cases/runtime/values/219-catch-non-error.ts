// xl:title 抛出非 Error 值并接住（字符串 / 数字 / 对象）
// xl:round 623
// xl:judge stdout
// xl:end

function t(v: any) {
  try { throw v; } catch (e) { console.log(typeof e, String(e)); }
}
t("s");
t(7);
t({ a: 1 });
