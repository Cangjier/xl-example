// xl:title `switch` 里 `break` 之后那一格不跑、`case` 里调用的副作用只发生一次
// xl:round 742
// xl:judge stdout
// xl:end
const log: string[] = [];
const t = (s: string) => { log.push(s); return s; };
switch (t("d")) {
  case t("a"): log.push("A"); break;
  case t("d"): log.push("D"); break;
  case t("e"): log.push("E"); break;
}
console.log(log.join(","));
