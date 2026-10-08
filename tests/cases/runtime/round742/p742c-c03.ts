// xl:title 匹配上之后，后面的 `case` 表达式**不再求值**
// xl:round 742
// xl:judge stdout
// xl:end
const log: string[] = [];
const t = (s: string) => { log.push(s); return s; };
switch (t("d")) {
  case t("d"): log.push("hit"); break;
  case t("e"): log.push("E"); break;
}
console.log(log.join(","));
