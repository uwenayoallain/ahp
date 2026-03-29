import { useState } from 'react'
import { Markdown } from './Markdown'

type MarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

export function MarkdownEditor({ value, onChange, placeholder, rows = 8 }: MarkdownEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write')

  return (
    <div className="md-editor">
      <div className="md-editor-tabs">
        <button
          type="button"
          className={`md-editor-tab ${mode === 'write' ? 'md-editor-tab--active' : ''}`}
          onClick={() => setMode('write')}
        >
          Write
        </button>
        <button
          type="button"
          className={`md-editor-tab ${mode === 'preview' ? 'md-editor-tab--active' : ''}`}
          onClick={() => setMode('preview')}
        >
          Preview
        </button>
      </div>

      <div className="md-editor-toolbar">
        <button type="button" title="Bold" onClick={() => onChange(wrapSelection(value, '**'))}>B</button>
        <button type="button" title="Italic" onClick={() => onChange(wrapSelection(value, '_'))}>I</button>
        <button type="button" title="Code" onClick={() => onChange(wrapSelection(value, '`'))}>{'<>'}</button>
        <button type="button" title="Heading" onClick={() => onChange(prefixLine(value, '### '))}>H</button>
        <button type="button" title="List" onClick={() => onChange(prefixLine(value, '- '))}>List</button>
        <button type="button" title="Link" onClick={() => onChange(value + '[text](url)')}>Link</button>
      </div>

      {mode === 'write' ? (
        <textarea
          className="md-editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
        />
      ) : (
        <div className="md-editor-preview">
          {value ? (
            <Markdown content={value} />
          ) : (
            <p className="md-editor-empty">Nothing to preview</p>
          )}
        </div>
      )}
    </div>
  )
}

function wrapSelection(text: string, wrapper: string) {
  return `${text}${wrapper}text${wrapper}`
}

function prefixLine(text: string, prefix: string) {
  const suffix = text.endsWith('\n') ? '' : '\n'
  return `${text}${suffix}${prefix}`
}
