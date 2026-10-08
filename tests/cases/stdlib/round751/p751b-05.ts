// xl:title 裸的 `BigInt` 名字在降级期的待遇
// xl:round 751
// xl:judge stdout
// xl:want differ
// xl:why **裸的 `BigInt` 这个名字根本不在全局名单里**：`BigInt as any` 在**降级期**就报
// xl:why `name is not a local or a capture: BigInt`——那句话听起来像脚本写错了变量名，
// xl:why 其实是**名单少了一个名字**（与第 145 轮 `Boolean`、第 228 轮 `Function` 那两条一字不差：
// xl:why 名单与 `BuildGlobals` 是**同一份约定**）。
// xl:why **两边一起加才算做完**（名单里有、`BuildGlobals` 没挂 ⇒「声明了却没提供」，判据里量着）——
// xl:why 而 `BigInt` 要的是**真的大整数那一档**（`1n` 字面量、`BigInt.prototype.toString`、`typeof` 给 `"bigint"`），
// xl:why 台账里 `runtime/values/079-bigint-forms` 与 `stdlib/globals/052/061` 三条都等着它。
// xl:why **只往名单里添一个名字**会让这一格从「降级期报名字」变成「运行期读不到」——那不是收账，是换个地方藏起来。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log("typeof (BigInt as any)", show(() => typeof (BigInt as any)));
console.log("typeof (globalThis as any)", show(() => typeof (globalThis as any).BigInt));
