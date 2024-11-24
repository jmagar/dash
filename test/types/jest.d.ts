/// <reference types="jest" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDTO(): R;
    }
  }

  var performanceThresholds: {
    instantiation: number;
    validation: number;
    serialization: number;
  };
}

export {};
