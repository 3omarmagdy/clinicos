declare module 'bcryptjs' {
  function compare(data: string, encrypted: string): Promise<boolean>;
  function hash(data: string, salt: number): Promise<string>;
  export { compare, hash };
}
