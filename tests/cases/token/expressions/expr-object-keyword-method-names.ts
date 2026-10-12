// xl:note reserved words as object literal method names
// xl:expect ObjectLiteral,MethodDeclaration,MethodBody,ReturnType,ClassBody
class A {
  return(): number { return 1; }
}
const table = {
  return(): number { return 1; },
  throw(): number { return 2; },
  delete(): number { return 3; },
  new(): number { return 4; },
  in(): number { return 5; },
  typeof(): number { return 6; },
  void(): number { return 7; },
  await(): number { return 8; },
  yield(): number { return 9; },
  this(): number { return 10; },
  null(): number { return 11; },
  default(): number { return 12; },
  extends(): number { return 13; },
  instanceof(): number { return 14; },
};
