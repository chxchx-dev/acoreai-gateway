import { Injectable } from '@nestjs/common';

@Injectable()
export class PromptBuilderService {
  withConversationHistory(input: {
    basePrompt: string;
    summaryBlock: string;
    historyBlock: string;
    customSystem?: string;
  }): string {
    const sections = [input.basePrompt];

    if (input.summaryBlock.trim()) {
      sections.push(
        [
          'Resumen previo de la conversacion:',
          input.summaryBlock,
          '',
          'Usa este resumen solo para continuidad. No lo cites como fuente documental.',
        ].join('\n'),
      );
    }

    if (input.historyBlock.trim()) {
      sections.push(
        [
          'Historial reciente de la conversacion:',
          input.historyBlock,
          '',
          'Usa este historial solo para mantener continuidad. No lo cites como fuente documental.',
        ].join('\n'),
      );
    }

    return this.appendCustomSystem(sections.join('\n\n'), input.customSystem);
  }

  appendCustomSystem(basePrompt: string, customSystem?: string): string {
    const trimmedSystem = customSystem?.trim();
    if (!trimmedSystem) {
      return basePrompt;
    }

    return `${basePrompt}\n\n${trimmedSystem}`;
  }
}
