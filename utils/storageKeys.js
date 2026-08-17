const STORAGE_PREFIX = 'plantpal:';

export function storageKey(name) {
  return `${STORAGE_PREFIX}${name}`;
}
