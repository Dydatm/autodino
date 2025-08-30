declare module 'is-disposable-email-domain' {
  const disposable: {
    isDisposable(domain: string): Promise<boolean> | boolean
    isFree?(domain: string): Promise<boolean> | boolean
    isBlackList?(domain: string): Promise<boolean> | boolean
    validate?(email: string): Promise<boolean> | boolean
  }
  export default disposable
}
