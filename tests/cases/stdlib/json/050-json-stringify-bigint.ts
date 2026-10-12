// xl:title JSON.stringify：BigInt 值该抛 TypeError（普通程序里会撞上）
// xl:judge stdout
// xl:want blocked
// xl:why `BigInt` 字面量没进来；这一条量的是 `JSON.stringify` 碰到 BigInt 该抛 `TypeError`。**必做**
// xl:end

try { JSON.stringify({ n: 1n }); } catch (e) { console.log("bigint:" + (e as Error).name); }
try { JSON.stringify(2n); } catch (e) { console.log("top:" + (e as Error).name); }
try { JSON.stringify([1n]); } catch (e) { console.log("in-array:" + (e as Error).name); }
console.log(typeof 1n, (2n + 3n) === 5n);
