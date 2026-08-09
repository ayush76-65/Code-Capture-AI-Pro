import React, { useCallback, useRef, useState } from 'react';
import { isValidImageType, formatFileSize } from '@/services/image-utils';
import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_MB } from '@/shared/constants';

interface ImageUploadProps {
  onImageSelected: (imageDataUrl: string) => void;
}

export function ImageUpload({ onImageSelected }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback((file: File) => {
    setError(null);

    if (!isValidImageType(file.type)) {
      setError(`Unsupported format: ${file.type}. Use PNG, JPG, or WebP.`);
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(`File too large (${formatFileSize(file.size)}). Maximum: ${MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        onImageSelected(dataUrl);
      }
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsDataURL(file);
  }, [onImageSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  }, [processFile]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          processFile(file);
          return;
        }
      }
    }
  }, [processFile]);

  return (
    <div onPaste={handlePaste} tabIndex={0} className="outline-none">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-app-accent bg-app-accent/10 scale-[1.01]'
            : 'border-app-border hover:border-app-text-muted hover:bg-app-panel/50'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
            isDragOver ? 'bg-app-accent/20' : 'bg-app-panel'
          }`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke={isDragOver ? '#238636' : '#8b949e'} strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 3V15M12 3L8 7M12 3L16 7" stroke={isDragOver ? '#238636' : '#8b949e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div>
            <p className="text-sm font-medium text-app-text">
              {isDragOver ? 'Drop image here' : 'Upload Image'}
            </p>
            <p className="text-xs text-app-text-secondary mt-1">
              Drag & drop, click to browse, or Ctrl+V to paste
            </p>
            <p className="text-2xs text-app-text-muted mt-1">
              PNG, JPG, WebP • Max {MAX_IMAGE_SIZE_MB}MB
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-app-danger flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
