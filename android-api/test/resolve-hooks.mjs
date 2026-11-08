import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const mocks = path.join(root, 'test', 'mocks');

/** Modules that need a device: replaced by test doubles. */
const MOCKS = {
  'react-native': 'react-native.ts',
  'expo-speech-recognition': 'expo-speech-recognition.ts',
  '@/data/repository': 'repository.ts',
  '@/lib/files': 'files.ts',
  '@/lib/media': 'media.ts',
};

import { statSync } from 'node:fs';

const isFile = (candidate) => {
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
};

/** `foo` → `foo.ts`, `foo.tsx` or `foo/index.ts`; an exact file path is kept. */
function withExtension(base) {
  return [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')].find(isFile) ?? null;
}

export async function resolve(specifier, context, next) {
  if (MOCKS[specifier]) return { url: pathToFileURL(path.join(mocks, MOCKS[specifier])).href, shortCircuit: true };
  let base = null;
  if (specifier.startsWith('@/')) base = path.join(src, specifier.slice(2));
  else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (base) {
    const file = withExtension(base);
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  return next(specifier, context);
}
