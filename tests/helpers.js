// Shared helpers for the tests: load an example server from tests/fixtures.
import { readFileSync } from 'node:fs';

export function fixture(name) {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
}
