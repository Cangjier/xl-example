// xl:note ambient module containing a class
// xl:expect Class,ClassBody,MethodDeclaration,ReturnType
declare module "x" {
  class C {
    m(): void;
  }
}
