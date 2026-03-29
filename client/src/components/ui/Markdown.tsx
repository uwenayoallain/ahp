import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type MarkdownProps = {
  content: string
  className?: string
}

export function Markdown({ content, className }: MarkdownProps) {
  if (!content) return null

  return (
    <div className={`markdown-body ${className ?? ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
