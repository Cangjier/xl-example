// xl:title 前缀套前缀（`!!` / `~~` / `- -` / `typeof typeof`）
// xl:round 740
// xl:judge stdout
// xl:end
console.log(!!1, !!0, ~~2.7, - -3, + +4);
console.log(typeof typeof 1, typeof void 0, void typeof 1);
console.log(-(2 ** 2), (-2) ** 2);
