'use client';
import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { emptyDesk, readDesk, STORAGE_KEY, type Desk } from './model';

export function useDesk() {
  const [desk, renderDesk] = useState<Desk>(emptyDesk);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const current = useRef(desk);
  const snapshot = useRef<string | null>(null);
  const canSave = useRef(false);
  useEffect(() => {
    let mounted = true;
    function load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        current.current = readDesk(raw); snapshot.current = raw;
        renderDesk(current.current); canSave.current = true; setStorageError('');
      } catch {
        canSave.current = false;
        setStorageError('تعذّر فتح السجل المحفوظ. لم تُستبدل بياناتك الحالية. يمكنك مواصلة استخدام المكتب في هذه الجلسة، أو إعادة ضبط السجل من الإعدادات.');
      }
    }
    void navigator.locks.request(STORAGE_KEY, () => {
      if (!mounted) return;
      load();
      if (canSave.current && snapshot.current === null) {
        try { const raw = JSON.stringify(current.current); localStorage.setItem(STORAGE_KEY, raw); snapshot.current = raw; }
        catch { setStorageError('تعذّر على هذا المتصفح حفظ تغييراتك. أبقِ علامة التبويب هذه مفتوحة؛ جلستك الحالية ما زالت تعمل. أفرغ بعض مساحة تخزين المتصفح وحاول مجددًا.'); }
      }
      setReady(true);
    });
    const sync = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) load(); };
    window.addEventListener('storage', sync);
    return () => { mounted = false; window.removeEventListener('storage', sync); };
  }, []);

  async function setDesk(update: SetStateAction<Desk>, signal?: AbortSignal) {
    await navigator.locks.request(STORAGE_KEY, signal ? { signal } : {}, () => {
      let base = current.current;
      if (canSave.current) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw !== snapshot.current) { base = readDesk(raw); snapshot.current = raw; }
        } catch {
          canSave.current = false;
          setStorageError('تغيّر السجل خارج علامة التبويب هذه وتعذّرت قراءته. لم تُستبدل بياناتك الحالية. التغييرات الحالية متاحة في هذه الجلسة فقط.');
        }
      }
      const next = typeof update === 'function' ? update(base) : update;
      current.current = next; renderDesk(next);
      if (!canSave.current) return;
      try { const raw = JSON.stringify(next); localStorage.setItem(STORAGE_KEY, raw); snapshot.current = raw; setStorageError(''); }
      catch { setStorageError('تعذّر على هذا المتصفح حفظ تغييراتك. أبقِ علامة التبويب هذه مفتوحة؛ جلستك الحالية ما زالت تعمل. أفرغ بعض مساحة تخزين المتصفح وحاول مجددًا.'); }
    });
  }

  async function resetDesk(): Promise<boolean> {
    return navigator.locks.request(STORAGE_KEY, () => {
      let removed = false;
      try { localStorage.removeItem(STORAGE_KEY); snapshot.current = null; canSave.current = true; setStorageError(''); removed = true; }
      catch { canSave.current = false; setStorageError('تخزين المتصفح غير متاح. مُسحت بيانات هذه الجلسة، لكن تعذّر حذف السجل المحفوظ.'); }
      current.current = emptyDesk(); renderDesk(current.current);
      return removed;
    });
  }
  return { desk, setDesk, ready, storageError, resetDesk };
}
