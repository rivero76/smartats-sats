/**
 * UPDATE LOG
 * 2026-03-26 | S3-1: polyfill browser APIs absent from jsdom that pdfjs-dist needs at module load (P19-S3-1)
 */

// pdfjs-dist uses DOMMatrix at module load time; jsdom doesn't include it.
// Provide a minimal stub so the module can be imported in the test environment.
if (!globalThis.DOMMatrix) {
  class DOMMatrixStub {
    a = 1
    b = 0
    c = 0
    d = 1
    e = 0
    f = 0
    constructor(_init?: string | number[]) {}
    static fromMatrix() {
      return new DOMMatrixStub()
    }
    static fromFloat32Array() {
      return new DOMMatrixStub()
    }
    static fromFloat64Array() {
      return new DOMMatrixStub()
    }
    multiply() {
      return this
    }
    translate() {
      return this
    }
    scale() {
      return this
    }
    rotate() {
      return this
    }
    inverse() {
      return this
    }
    transformPoint(p: DOMPointInit) {
      return { x: p.x ?? 0, y: p.y ?? 0, z: p.z ?? 0, w: p.w ?? 1 }
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.DOMMatrix = DOMMatrixStub as any
}
