"use client";

import React, { useCallback, useRef, useState } from "react";

interface Props {
  onFile: (file: File) => void;
  isProcessing?: boolean;
  label?: string;
  hint?: string;
}

export default function FileUpload({ onFile, isProcessing = false, label, hint }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "xls") {
        alert("Please upload an Excel file (.xlsx or .xls)");
        return;
      }
      onFile(file);
    },
    [onFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const onClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const zoneClasses = [
    "upload-zone",
    dragOver ? "drag-over" : "",
    isProcessing ? "processing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="upload-section">
      <div
        className={zoneClasses}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={onClick}
      >
        <div className="upload-icon">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        {isProcessing ? (
          <>
            <div className="upload-title">Processing file…</div>
            <div className="upload-hint">Parsing Excel and running validations</div>
          </>
        ) : (
          <>
            <div className="upload-title">
              {label || <>Drop your Excel file here, or <span style={{ color: "var(--accent)" }}>browse</span></>}
            </div>
            <div className="upload-hint">{hint || "Supports .xlsx and .xls files"}</div>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={onInputChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
