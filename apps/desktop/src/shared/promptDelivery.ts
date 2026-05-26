/** Prompts longer than this require explicit confirmation before terminal delivery. */
export const PROMPT_SEND_CONFIRM_THRESHOLD = 500;

/** Delay between chunked terminal writes so Windows shells can accept multi-line input. */
export const PROMPT_TERMINAL_LINE_DELAY_MS = 15;

export const shouldConfirmPromptSend = (prompt: string): boolean =>
  prompt.length >= PROMPT_SEND_CONFIRM_THRESHOLD;

export const splitPromptLines = (prompt: string): string[] => prompt.split(/\r?\n/);

/**
 * Writes a prompt to an interactive terminal one line at a time.
 * Callers should prefer copying to the clipboard first when possible.
 */
export const writePromptToTerminal = async (
  prompt: string,
  write: (data: string) => void,
  delayMs: number = PROMPT_TERMINAL_LINE_DELAY_MS
): Promise<void> => {
  const lines = splitPromptLines(prompt);

  for (let index = 0; index < lines.length; index += 1) {
    const isLastLine = index === lines.length - 1;
    const suffix = isLastLine ? "\r" : "\r\n";
    write(`${lines[index]}${suffix}`);

    if (!isLastLine && delayMs > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }
  }
};

export interface DeliverPromptResult {
  copiedToClipboard: boolean;
  wroteToTerminal: boolean;
}

export const deliverPromptToTerminal = async (input: {
  prompt: string;
  write: (data: string) => void;
  copyToClipboard?: (text: string) => Promise<boolean>;
}): Promise<DeliverPromptResult> => {
  let copiedToClipboard = false;

  if (input.copyToClipboard) {
    copiedToClipboard = await input.copyToClipboard(input.prompt);
  }

  await writePromptToTerminal(input.prompt, input.write);

  return {
    copiedToClipboard,
    wroteToTerminal: true
  };
};
