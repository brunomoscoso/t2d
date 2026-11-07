import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type Stage =
  'initializing' | 'authentication' | 'extraction' | 'report' | 'complete' | 'failed';

export function reportProgress(stage: Stage, message: string): void {
  const event = { stage, message, time: new Date().toISOString() };
  console.log(`[T2D:${stage}] ${message}`);
  const directory = join(process.cwd(), 'output');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'status.json'), JSON.stringify(event, null, 2));
  appendFileSync(join(directory, 'progress.jsonl'), JSON.stringify(event) + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) {
    // Não permite que nomes de posições/PRITs injetem HTML no resumo do GitHub.
    const safe = message.replace(
      /[&<>]/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]!,
    );
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- **${stage}**: ${safe}\n`);
  }
}
