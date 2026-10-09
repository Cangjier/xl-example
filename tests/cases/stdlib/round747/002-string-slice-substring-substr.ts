// xl:title 字符串三兄弟：`slice` / `substring` / `substr` 的负参、反序与 `undefined` / `NaN`，以及 `charAt` / 下标 / `at`
// xl:round 747
// xl:judge stdout
// xl:want pass
// xl:end

const s = "abcdef";
console.log(s.slice(1, 3), s.slice(-2), s.slice(3, 1), s.slice(-99, 99));
console.log(s.substring(1, 3), s.substring(3, 1), s.substring(-2, 2));
console.log(s.substr(1, 2), s.substr(-2), s.substr(-2, 1));
console.log(s.slice(undefined as any), s.substring(undefined as any), s.substr(undefined as any));
console.log(s.slice(NaN as any), s.substring(NaN as any), s.substr(NaN as any));
console.log(s.charAt(1), s[1], s.at(-1), s.at(9) === undefined);
