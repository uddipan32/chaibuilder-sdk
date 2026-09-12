export async function draftMode() {
  return {
    isEnabled: false,
    enable: async () => {},
    disable: async () => {},
  };
}

export async function cookies() {
  return {
    get: () => undefined,
    set: () => {},
    delete: () => {},
    has: () => false,
    getAll: () => [],
  };
}

export async function headers() {
  return new Headers();
}
