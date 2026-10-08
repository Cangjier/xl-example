// xl:title 类型位整片擦除：interface / type / declare
// xl:round 331
// xl:judge stdout
// xl:end

interface Point { x: number; y: number }
type Pair<T> = [T, T];
declare const injected: number;
function origin(): Point {
  return { x: 0, y: 0 };
}
const pair: Pair<string> = ["a", "b"];
console.log(origin().x, pair.join("-"), typeof injected);
