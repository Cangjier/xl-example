// xl:title 三元链、?? 与 || 的优先级和短路
// xl:round 9
// xl:judge stdout
// xl:end

let log: string[] = [];
function t(name: string, v: any) { log.push(name); return v; }
console.log(t("a", 0) ?? t("b", 1));
console.log(t("c", 0) || t("d", 1));
console.log(t("e", 1) && t("f", 0));
console.log(log.join(""));
const grade = (n: number) => n >= 90 ? "A" : n >= 80 ? "B" : "C";
console.log(grade(95), grade(85), grade(10));
