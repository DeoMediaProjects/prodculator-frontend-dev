import '@testing-library/jest-dom';

// jsdom has no layout engine and therefore no ResizeObserver. Components that
// measure responsive controls still need the lifecycle surface in unit tests.
class ResizeObserverMock implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverMock;
