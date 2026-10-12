// xl:title `switch` 用严格相等、`default` 位置无关
// xl:round 691
// xl:judge stdout
// xl:end
function t(v: any): string { switch (v) { case "1": return "str"; case 1: return "num"; default: return "other"; } }
console.log(t("1"), t(1), t(true));
function u(v: any): string { switch (v) { default: return "d"; case 1: return "one"; } }
console.log(u(1), u(2));
