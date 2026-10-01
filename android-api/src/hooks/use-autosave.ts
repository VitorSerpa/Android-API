import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** RF-06 / CA-01: the diary saves itself every 30 seconds while there are unsaved changes. */
export const AUTOSAVE_INTERVAL_MS = 30_000;

/**
 * Calls `save` every 30 s while `dirty`, and also right away when the app goes
 * to the background or the screen unmounts — so closing the app mid-sentence
 * still keeps the last text (CA-02).
 */
export function useAutosave(dirty: boolean, save: () => void) {
  const saveRef = useRef(save);
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    saveRef.current = save;
    dirtyRef.current = dirty;
  });

  useEffect(() => {
    if (!dirty) return;
    const id = setInterval(() => saveRef.current(), AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [dirty]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && dirtyRef.current) saveRef.current();
    });
    return () => {
      subscription.remove();
      if (dirtyRef.current) saveRef.current();
    };
  }, []);
}
