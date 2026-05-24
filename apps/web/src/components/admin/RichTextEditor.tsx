'use client';

/**
 * Minimal contentEditable rich text editor with a toolbar.
 *
 * We deliberately avoid TipTap / Lexical / Slate here — the newsletter
 * composer only needs basic inline formatting plus headings, lists,
 * and links. `document.execCommand` is technically deprecated but
 * still implemented in every major browser and ships zero bytes of
 * runtime. If the editor's needs ever outgrow this, swapping in a
 * proper library is local to this file.
 *
 * The parent reads HTML via `onChange(html)`. Pasted content is
 * normalized through `text/plain` to keep the output predictable.
 */
import { useCallback, useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

type Command =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'p'
  | 'ul'
  | 'ol'
  | 'link'
  | 'clear';

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your newsletter…',
  minHeight = 280,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string>(value);

  // Sync the contentEditable DOM when `value` changes from outside (eg
  // "Clear" button or loading a draft). We compare against the last
  // value we pushed up so we don't fight the user's caret position
  // while they're typing.
  useEffect(() => {
    if (!ref.current) return;
    if (value !== lastValueRef.current && value !== ref.current.innerHTML) {
      ref.current.innerHTML = value;
      lastValueRef.current = value;
    }
  }, [value]);

  const emit = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastValueRef.current = html;
    onChange(html);
  }, [onChange]);

  const exec = useCallback(
    (cmd: Command) => {
      ref.current?.focus();
      switch (cmd) {
        case 'bold':
        case 'italic':
        case 'underline':
          document.execCommand(cmd, false);
          break;
        case 'h1':
        case 'h2':
        case 'h3':
        case 'p':
          document.execCommand('formatBlock', false, cmd.toUpperCase());
          break;
        case 'ul':
          document.execCommand('insertUnorderedList', false);
          break;
        case 'ol':
          document.execCommand('insertOrderedList', false);
          break;
        case 'link': {
          const url = window.prompt('Link URL');
          if (url && /^https?:\/\//i.test(url)) {
            document.execCommand('createLink', false, url);
          }
          break;
        }
        case 'clear':
          document.execCommand('removeFormat', false);
          document.execCommand('formatBlock', false, 'P');
          break;
      }
      emit();
    },
    [emit],
  );

  // Strip styles from pasted HTML — paste as text and re-insert via
  // execCommand so the editor's own formatting rules apply.
  const onPaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // Tab inserts spaces instead of moving focus; saves a constant
  // "where did my focus go" trip out of the editor.
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
    }
  }, []);

  const isEmpty = value.replace(/<[^>]+>/g, '').trim().length === 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-bone-50/10 bg-white/[0.02] focus-within:border-ember-500/40">
      <div className="flex flex-wrap items-center gap-1 border-b border-bone-50/10 bg-white/[0.02] px-2 py-1.5">
        <Group>
          <Tool label="B" title="Bold (⌘B)" onClick={() => exec('bold')} bold />
          <Tool label="I" title="Italic (⌘I)" onClick={() => exec('italic')} italic />
          <Tool label="U" title="Underline (⌘U)" onClick={() => exec('underline')} underline />
        </Group>
        <Divider />
        <Group>
          <Tool label="H1" title="Heading 1" onClick={() => exec('h1')} />
          <Tool label="H2" title="Heading 2" onClick={() => exec('h2')} />
          <Tool label="H3" title="Heading 3" onClick={() => exec('h3')} />
          <Tool label="¶" title="Paragraph" onClick={() => exec('p')} />
        </Group>
        <Divider />
        <Group>
          <Tool label="• List" title="Bulleted list" onClick={() => exec('ul')} />
          <Tool label="1. List" title="Numbered list" onClick={() => exec('ol')} />
          <Tool label="Link" title="Insert link" onClick={() => exec('link')} />
        </Group>
        <Divider />
        <Tool label="Clear" title="Remove formatting" onClick={() => exec('clear')} />
      </div>

      <div className="relative">
        {isEmpty && (
          <p className="pointer-events-none absolute top-4 left-5 font-sans text-sm text-bone-50/30">
            {placeholder}
          </p>
        )}
        <div
          ref={ref}
          role="textbox"
          aria-multiline
          aria-label="Newsletter body"
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          className="prose-newsletter min-h-[var(--editor-min-h)] w-full px-5 py-4 text-bone-50 outline-none"
          style={{ ['--editor-min-h' as string]: `${minHeight}px` }}
        />
      </div>

    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-bone-50/10" />;
}

function Tool({
  label,
  title,
  onClick,
  bold,
  italic,
  underline,
}: {
  label: string;
  title: string;
  onClick: () => void;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      // Critical: don't take focus or the contentEditable loses its
      // selection range and the formatting command operates on an
      // empty range.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-md px-1.5 font-mono text-[11px] text-bone-200 transition-colors hover:bg-white/10 hover:text-bone-50 ${bold ? 'font-bold' : ''} ${italic ? 'italic' : ''} ${underline ? 'underline' : ''}`}
    >
      {label}
    </button>
  );
}
