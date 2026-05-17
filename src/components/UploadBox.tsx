'use client';

import { useCallback, useRef, useState } from 'react';
import { ACCEPTED_EXT, ACCEPTED_MIME, MAX_FILE_BYTES } from '@/lib/constants';
import type { Translator } from '@/lib/i18n';

interface Props {
  file: File | null;
  onFile: (file: File | null) => void;
  onError: (message: string | null) => void;
  t: Translator;
  disabled?: boolean;
}

export function UploadBox({ file, onFile, onError, t, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSet = useCallback(
    (f: File | null) => {
      if (!f) {
        onFile(null);
        return;
      }
      const isPdfMime = f.type === ACCEPTED_MIME || f.type === '';
      const isPdfName = f.name.toLowerCase().endsWith(ACCEPTED_EXT);
      if (!isPdfMime || !isPdfName) {
        onError(t('error.badType'));
        return;
      }
      if (f.size > MAX_FILE_BYTES) {
        onError(t('error.tooLarge'));
        return;
      }
      if (f.size === 0) {
        onError(t('error.emptyPdf'));
        return;
      }
      onError(null);
      onFile(f);
    },
    [onFile, onError, t],
  );

  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) validateAndSet(dropped);
      }}
      className={[
        'relative rounded-3xl p-7 sm:p-10 text-center transition-all overflow-hidden',
        'border-2 border-dashed',
        dragging
          ? 'border-brand-500 bg-brand-50/70 scale-[1.01] shadow-glow'
          : 'border-ink-200 bg-gradient-to-br from-white via-white to-ink-50/50 hover:border-brand-400 hover:bg-white',
        disabled ? 'opacity-60 pointer-events-none' : '',
      ].join(' ')}
    >
      {/* Decorative gradient blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -end-10 w-40 h-40 rounded-full bg-brand-200/50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -start-10 w-44 h-44 rounded-full bg-accent-200/40 blur-3xl"
      />

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME}
        className="hidden"
        onChange={(e) => validateAndSet(e.target.files?.[0] ?? null)}
      />

      {!file ? (
        <div className="relative flex flex-col items-center gap-4 animate-fade-in">
          <UploadIcon active={dragging} />
          <div>
            <div className="text-ink-900 font-bold text-lg">{t('upload.dropHere')}</div>
            <div className="mt-1 text-sm text-ink-500">{t('upload.or')}</div>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-primary"
          >
            <FolderIcon />
            {t('upload.browse')}
          </button>
          <div className="flex items-center gap-3 text-xs text-ink-500 mt-1">
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon />
              {t('upload.maxSize')}
            </span>
            <span className="text-ink-300">·</span>
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon />
              {t('upload.onlyPdf')}
            </span>
          </div>
        </div>
      ) : (
        <SelectedFile
          file={file}
          onRemove={() => {
            onFile(null);
            if (inputRef.current) inputRef.current.value = '';
          }}
          t={t}
        />
      )}
    </div>
  );
}

function SelectedFile({
  file,
  onRemove,
  t,
}: {
  file: File;
  onRemove: () => void;
  t: Translator;
}) {
  return (
    <div className="relative flex items-center gap-4 text-start animate-scale-in">
      <div className="relative w-14 h-14 rounded-2xl bg-gradient-brand grid place-items-center text-white shrink-0 shadow-elev">
        <span className="absolute inset-0 rounded-2xl ring-1 ring-white/40 pointer-events-none" />
        <FileIcon />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-bold text-brand-600">
            {t('upload.selected')}
          </span>
          <span className="text-[10px] font-bold text-emerald-600 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            PDF
          </span>
        </div>
        <div className="mt-0.5 font-bold text-ink-900 truncate" title={file.name}>
          {file.name}
        </div>
        <div className="mt-1 text-xs text-ink-500 font-medium">{formatBytes(file.size)}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="text-xs font-semibold text-ink-500 hover:text-red-600 px-3 py-2 rounded-full border border-ink-200 hover:border-red-200 hover:bg-red-50 transition-colors"
      >
        {t('upload.remove')}
      </button>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function UploadIcon({ active }: { active: boolean }) {
  return (
    <div className="relative">
      {active && (
        <span className="absolute inset-0 rounded-3xl bg-brand-500/30 animate-pulse-ring" aria-hidden />
      )}
      <div className="relative w-16 h-16 rounded-3xl bg-gradient-brand grid place-items-center text-white shadow-elev">
        <span className="absolute inset-0 rounded-3xl ring-1 ring-white/40" />
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 4v12m0-12-4 4m4-4 4 4M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 3h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 13h6M7 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m5 12 5 5L20 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
