// xl:note two ambient module declarations with the same name
// xl:expect Let
declare module "x" {
  const a: number;
}
declare module "x" {
  const b: string;
}
