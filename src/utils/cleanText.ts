/**
 * Utility to clean AI responses for user display without destroying Markdown syntax.
 */
export function cleanMarkdownText(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();

  // Strip code block wrappers if the model wrapped the response in ```markdown ... ```
  if (cleaned.startsWith('```markdown')) {
    cleaned = cleaned.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
  }

  return cleaned.trim();
}
