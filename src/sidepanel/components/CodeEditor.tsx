import React, { useRef, useEffect, useMemo } from 'react';
import { EditorView, lineNumbers, highlightActiveLine, highlightSpecialChars, drawSelection, keymap } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultHighlightStyle, syntaxHighlighting, bracketMatching, foldGutter } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';

// ─── Language imports (lazy-loaded via dynamic compartment) ─────────────────────

import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { php } from '@codemirror/lang-php';
import { rust } from '@codemirror/lang-rust';
import { sql } from '@codemirror/lang-sql';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { xml } from '@codemirror/lang-xml';
import { markdown } from '@codemirror/lang-markdown';

// ─── Language resolver ──────────────────────────────────────────────────────────

function getLanguageExtension(langId: string) {
  switch (langId) {
    case 'python':
      return python();
    case 'javascript':
      return javascript();
    case 'typescript':
      return javascript({ typescript: true });
    case 'java':
      return java();
    case 'c':
    case 'cpp':
      return cpp();
    case 'csharp':
      return cpp(); // C# syntax is close enough for highlighting
    case 'kotlin':
      return java(); // Kotlin is syntactically similar to Java for highlighting
    case 'dart':
      return java(); // Dart highlighting is similar to Java
    case 'swift':
      return java(); // Swift → Java as closest available
    case 'go':
      return java(); // Go → Java as closest available
    case 'php':
      return php();
    case 'rust':
      return rust();
    case 'sql':
      return sql();
    case 'html':
      return html();
    case 'css':
      return css();
    case 'xml':
      return xml();
    case 'markdown':
      return markdown();
    case 'ruby':
      return python(); // Ruby is syntactically similar to Python for highlighting
    case 'lua':
      return python(); // Lua → Python as closest available
    case 'shell':
      return python(); // Shell → Python as closest available
    default:
      return [];
  }
}

// ─── Custom dark theme matching the app ─────────────────────────────────────────

const appDarkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#0d1117',
    color: '#e6edf3',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
    caretColor: '#238636',
    padding: '12px 0',
  },
  '.cm-gutters': {
    backgroundColor: '#0d1117',
    color: '#484f58',
    borderRight: '1px solid #21262d',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#161b2240',
    color: '#e6edf3',
  },
  '.cm-activeLine': {
    backgroundColor: '#161b2240',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: '#264f7844 !important',
  },
  '.cm-cursor': {
    borderLeftColor: '#238636',
  },
  '.cm-scroller': {
    overflow: 'auto',
    lineHeight: '1.6',
  },
  '.cm-foldGutter': {
    width: '12px',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: '#264f7844',
  },
  '&.cm-focused': {
    outline: 'none',
  },
}, { dark: true });

// ─── Component ──────────────────────────────────────────────────────────────────

interface CodeEditorProps {
  code: string;
  language: string;
  fontSize?: number;
  wordWrap?: boolean;
  minimap?: boolean;
  readOnly?: boolean;
  height?: string;
}

export function CodeEditor({
  code,
  language,
  fontSize = 14,
  wordWrap = true,
  readOnly = true,
  height = '100%',
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const langCompartment = useRef(new Compartment());
  const fontSizeCompartment = useRef(new Compartment());
  const wrapCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());

  // Font size theme
  const fontSizeTheme = useMemo(() =>
    EditorView.theme({
      '.cm-content': { fontSize: `${fontSize}px` },
      '.cm-gutters': { fontSize: `${fontSize}px` },
    }),
  [fontSize]);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    const langExtension = getLanguageExtension(language);

    const state = EditorState.create({
      doc: code,
      extensions: [
        // Core extensions
        lineNumbers(),
        highlightActiveLine(),
        highlightSpecialChars(),
        drawSelection(),
        bracketMatching(),
        foldGutter(),

        // Syntax highlighting
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        oneDark,
        appDarkTheme,

        // Compartments (for dynamic updates)
        langCompartment.current.of(langExtension),
        fontSizeCompartment.current.of(fontSizeTheme),
        wrapCompartment.current.of(wordWrap ? EditorView.lineWrapping : []),
        readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly)),

        // Disable editing keybindings in read-only mode
        EditorView.editable.of(!readOnly),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // Only run once on mount

  // Update code content
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== code) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: code,
        },
      });
    }
  }, [code]);

  // Update language
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const langExtension = getLanguageExtension(language);
    view.dispatch({
      effects: langCompartment.current.reconfigure(langExtension),
    });
  }, [language]);

  // Update font size
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: fontSizeCompartment.current.reconfigure(fontSizeTheme),
    });
  }, [fontSizeTheme]);

  // Update word wrap
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: wrapCompartment.current.reconfigure(
        wordWrap ? EditorView.lineWrapping : []
      ),
    });
  }, [wordWrap]);

  // Update read-only
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: readOnlyCompartment.current.reconfigure(
        EditorState.readOnly.of(readOnly)
      ),
    });
  }, [readOnly]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-lg overflow-hidden border border-app-border"
      style={{ height }}
    />
  );
}
