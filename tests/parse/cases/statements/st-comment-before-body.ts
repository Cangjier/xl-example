// xl:note 关键字与结构括号之间夹一条注释——判定要跨 trivia（注释也是 trivia），不是只跨软换行
// xl:expect IfSet,IfBody,While,For,Foreach,Switch,Try
export function bodies(a: number): number {
  let total = 0;
  if /* 条件之前 */ (a > 0) {
    total += 1;
  }
  while /* 条件之前 */ (total < 3) {
    total += 1;
  }
  for /* 头之前 */ (let i = 0; i < 2; i++) {
    total += i;
  }
  for (const x of /* 可迭代之前 */ [1, 2]) {
    total += x;
  }
  do /* 体之前 */ {
    total += 1;
  } while (total < 5);
  switch /* 判别之前 */ (total) {
    case 1:
      break;
    default:
      break;
  }
  try /* 体之前 */ {
    total += 1;
  } catch /* 形参之前 */ {
    total = 0;
  } finally /* 收尾之前 */ {
    total += 0;
  }
  return total;
}
