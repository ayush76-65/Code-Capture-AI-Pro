import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VisionProvider, RecoveredCodeResult } from './types';
import type { RecoveryMode } from '@/shared/types';
import { detectLanguage, normalizeLanguageId } from '@/services/language-detector';

const SYSTEM_PROMPT_BASE = `You are a code reconstruction engine.

You are NOT a coding assistant.
You are NOT a code generator.
You are NOT a code optimizer.
You are NOT a refactoring engine.

You are viewing an image containing source code.
Your task is to reconstruct the original code exactly as shown.

HIGHEST PRIORITY: Preserve original code.

FORBIDDEN ACTIONS (never do these):
- changing logic
- changing algorithms
- renaming variables
- renaming functions
- renaming classes
- rewriting code
- optimizing code
- adding code that is not visible in the image
- removing code that is visible in the image

If uncertain about a character: preserve the original text. Do not guess. Do not invent code.

RESPONSE FORMAT:
1. First line: the programming language detected (just the name, e.g., "Python", "JavaScript")
2. Second line: your confidence as an integer from 0-100
3. Third line: empty
4. Fourth line onwards: the reconstructed code ONLY

Do not wrap the code in markdown code fences.
Do not add any explanations, comments, or notes.
Return ONLY the language, confidence, blank line, then the raw code.`;

const MODE_INSTRUCTIONS: Record<RecoveryMode, string> = {
  strict: `
RECOVERY MODE: Strict Preservation

ALLOWED ACTIONS:
- Indentation reconstruction (match the visual indentation from the image)
- Formatting reconstruction (line breaks, spacing as shown)

NO code modifications of any kind.
Reconstruct the code character-for-character as shown in the image.
If a character is ambiguous, choose the most likely character but do not change the code logic.`,

  visual: `
RECOVERY MODE: Visual Recovery

ALLOWED ACTIONS:
- Indentation reconstruction
- Visual typo recovery when visually obvious:
  - l ↔ I ↔ 1 (when context makes it clear which is correct)
  - O ↔ 0 (when context makes it clear)
  - { ↔ ( and [ ↔ { (when visually ambiguous but context clarifies)
- Punctuation recovery when visually obvious

Preserve all logic. Do not change variable names, function names, or any business logic.
Only recover characters that are visually ambiguous in the image.`,

  advanced: `
RECOVERY MODE: Advanced Recovery

ALLOWED ACTIONS:
- Indentation reconstruction
- Visual typo recovery
- Punctuation recovery
- Syntax repair ONLY when visually obvious (e.g., clearly missing closing bracket visible at edge of image)

NEVER change business logic, algorithms, variable names, function names, or class names.
Only repair syntax that is clearly broken due to visual capture artifacts.`,
};

export class GeminiProvider implements VisionProvider {
  readonly name = 'Google Gemini';
  readonly id = 'gemini';

  private apiKey: string;
  private model: string;
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string, model: string = 'gemini-2.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeCodeImage(
    imageBase64: string,
    mimeType: string,
    recoveryMode: RecoveryMode
  ): Promise<RecoveredCodeResult> {
    const cleanBase64 = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    const systemPrompt = SYSTEM_PROMPT_BASE + MODE_INSTRUCTIONS[recoveryMode];

    const generativeModel = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt,
    });

    const result = await generativeModel.generateContent([
      {
        inlineData: {
          mimeType: mimeType as 'image/png' | 'image/jpeg' | 'image/webp',
          data: cleanBase64,
        },
      },
      {
        text: 'Reconstruct the code shown in this image. Follow your system instructions precisely.',
      },
    ]);

    const response = result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      throw new Error('Vision AI returned an empty response. The image may not contain visible code.');
    }

    return this.parseResponse(text, recoveryMode);
  }

  async testConnection(): Promise<boolean> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const result = await model.generateContent('Reply with just the word "OK".');
      const text = result.response.text();
      return text.toLowerCase().includes('ok');
    } catch {
      return false;
    }
  }

  private parseResponse(text: string, recoveryMode: RecoveryMode): RecoveredCodeResult {
    const lines = text.split('\n');

    let language = 'plaintext';
    let confidence = 70;
    let codeStartIndex = 0;

    // Try to parse the structured response format
    if (lines.length >= 3) {
      const firstLine = lines[0].trim();
      const secondLine = lines[1].trim();

      // Check if the first line looks like a language name (short, no special chars)
      const isLikelyLanguage =
        firstLine.length < 30 &&
        /^[A-Za-z#+.\s]+$/.test(firstLine) &&
        !firstLine.includes('import') &&
        !firstLine.includes('from') &&
        !firstLine.includes('def') &&
        !firstLine.includes('function') &&
        !firstLine.includes('class') &&
        !firstLine.includes('const') &&
        !firstLine.includes('var') &&
        !firstLine.includes('let');

      if (isLikelyLanguage) {
        language = normalizeLanguageId(firstLine);
        codeStartIndex = 1;

        // Check if second line is a confidence number
        const parsedConfidence = parseInt(secondLine, 10);
        if (!isNaN(parsedConfidence) && parsedConfidence >= 0 && parsedConfidence <= 100) {
          confidence = parsedConfidence;
          codeStartIndex = 2;

          // Skip blank line after confidence
          if (lines[codeStartIndex]?.trim() === '') {
            codeStartIndex++;
          }
        }
      }
    }

    let code = lines.slice(codeStartIndex).join('\n');

    // Remove markdown code fences if present
    code = code.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');
    code = code.trimEnd();

    // If no language was extracted from the response, detect heuristically
    if (language === 'plaintext' && code.length > 0) {
      const detected = detectLanguage(code);
      language = detected.monacoId;
      confidence = Math.max(confidence, detected.confidence);
    }

    return {
      code,
      language,
      confidence: Math.min(confidence, 99),
    };
  }

  updateConfig(apiKey: string, model: string): void {
    this.apiKey = apiKey;
    this.model = model;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }
}
