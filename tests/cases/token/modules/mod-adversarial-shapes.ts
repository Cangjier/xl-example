// xl:note 模块层与字符串/模板层的对抗形状集（第 66 轮第十四批）
// xl:expect Namespace:5,String:9,ConstString:14,InterpolationString:7,UnionType,Import:2,Export:4,TypeOperator
declare module "m" { export = X; }
declare global { interface Window { x: A } }
import type { A as B } from "m";
export type { C } from "m";
export * as ns from "m";
namespace N { export import M = K; }
declare namespace O { const v: unique symbol }
type T1 = `a${B}c`;
type T2 = `a${B | C}d`;
type T3 = `${number}-${string}`;
const s1 = `x${y}z`;
const s2 = `a${`inner${Q}`}b`;
declare module "*.css" { const c: string; export default c }
export default class {}
