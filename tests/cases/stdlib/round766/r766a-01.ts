// xl:title `ToPrimitive` 给不出原始值时要抛 `TypeError`（不是普通 `Error`）
// xl:round 766
// xl:judge stdout
// xl:note 第 766 轮收掉的一格：`ToPrimitive` 两步（`valueOf` / `toString`）**都给了对象**时，
// xl:note JS 抛的是 `TypeError`（`Cannot convert object to a primitive value`），
// xl:note 而本仓抛的是**普通 `Error`** ⇒ 脚本里 `catch (e) { e instanceof TypeError }`
// xl:note 那一档**分不出来**（`e.constructor.name` 给 `"Error"`）。
// xl:note **两处落点一起改**（`Symbol.toPrimitive` 给了对象、普通那两步都没给原始值）：
// xl:note 抛宿主 `TypeError`，`Guard` 按宿主异常的类折成 `ErrorKindType`、
// xl:note 语言层再翻成脚本里的 `TypeError`（与第 713 轮 `in` 那一格同一个机关）。
// xl:end
const bothObjects: any = { valueOf() { return {}; }, toString() { return {}; } };
try { bothObjects + ""; } catch (e) { console.log("01", (e as Error).constructor.name, e instanceof TypeError); }
const badToPrimitive: any = { [Symbol.toPrimitive]() { return {}; } };
try { badToPrimitive + ""; } catch (e) { console.log("02", (e as Error).constructor.name, e instanceof TypeError); }
try { Number(bothObjects); } catch (e) { console.log("03", (e as Error).constructor.name); }
try { `${bothObjects}`; } catch (e) { console.log("04", (e as Error).constructor.name); }
// **给得出原始值的那几档照旧**：`valueOf` 先、`toString` 后，`Symbol.toPrimitive` 最优先。
const byValueOf: any = { valueOf() { return 7; } };
const byToString: any = { valueOf() { return {}; }, toString() { return "T"; } };
const bySymbol: any = { [Symbol.toPrimitive](hint: string) { return hint; }, valueOf() { return 1; } };
console.log("05", byValueOf + "", Number(byValueOf), String(byValueOf));
console.log("06", byToString + "", String(byToString));
console.log("07", bySymbol + "", `${bySymbol}`);
console.log("done");
