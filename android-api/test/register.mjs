/**
 * Lets `node --test` run the app's TypeScript domain code:
 * - resolves the `@/…` alias to `src/` and extension-less imports to `.ts`/`.tsx`;
 * - swaps native-only modules for the simulations in `test/mocks/`.
 * Node ≥ 22.7 runs the files with `--experimental-transform-types`.
 */
import { register } from 'node:module';

register('./resolve-hooks.mjs', import.meta.url);
