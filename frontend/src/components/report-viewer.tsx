import ReactMarkdown from 'react-markdown'
import { Card } from './ui/card'

type Props = {
  content: string
}

export const ReportViewer = ({ content }: Props) => (
  <Card className="prose prose-gray max-w-none space-y-4 dark:prose-invert">
    <ReactMarkdown>{content}</ReactMarkdown>
  </Card>
)
