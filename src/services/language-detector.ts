interface LanguageMatch {
  language: string;
  monacoId: string;
  confidence: number;
}

interface LanguagePattern {
  language: string;
  monacoId: string;
  patterns: RegExp[];
  weight: number;
}

const LANGUAGE_PATTERNS: LanguagePattern[] = [
  {
    language: 'Python',
    monacoId: 'python',
    patterns: [
      /^(import\s+\w+|from\s+\w+\s+import)/m,
      /def\s+\w+\s*\(/,
      /class\s+\w+.*:/,
      /if\s+__name__\s*==\s*['"]__main__['"]/,
      /print\s*\(/,
      /^\s*(elif|except|finally)\s/m,
      /:\s*$/m,
      /self\.\w+/,
      /lambda\s+/,
      /\bTrue\b|\bFalse\b|\bNone\b/,
    ],
    weight: 1,
  },
  {
    language: 'JavaScript',
    monacoId: 'javascript',
    patterns: [
      /\bconst\s+\w+\s*=/,
      /\blet\s+\w+\s*=/,
      /\bvar\s+\w+\s*=/,
      /=>\s*{/,
      /function\s+\w+\s*\(/,
      /console\.\w+\s*\(/,
      /document\.\w+/,
      /require\s*\(/,
      /module\.exports/,
      /\basync\s+function\b/,
    ],
    weight: 1,
  },
  {
    language: 'TypeScript',
    monacoId: 'typescript',
    patterns: [
      /:\s*(string|number|boolean|void|any|never|unknown)\b/,
      /interface\s+\w+\s*{/,
      /type\s+\w+\s*=/,
      /<\w+>/,
      /as\s+(string|number|boolean|any)/,
      /\benum\s+\w+/,
      /\bimport\s+type\b/,
      /:\s*\w+\[\]/,
      /\bReadonly<\w+>/,
      /\bPartial<\w+>/,
    ],
    weight: 1.2,
  },
  {
    language: 'Java',
    monacoId: 'java',
    patterns: [
      /public\s+(static\s+)?void\s+main/,
      /System\.out\.println/,
      /public\s+class\s+\w+/,
      /private\s+(final\s+)?\w+\s+\w+/,
      /import\s+java\./,
      /@Override/,
      /\bnew\s+\w+\s*\(/,
      /\bextends\s+\w+/,
      /\bimplements\s+\w+/,
      /\bpackage\s+[\w.]+;/,
    ],
    weight: 1,
  },
  {
    language: 'C',
    monacoId: 'c',
    patterns: [
      /#include\s*<\w+\.h>/,
      /\bint\s+main\s*\(/,
      /printf\s*\(/,
      /scanf\s*\(/,
      /\bmalloc\s*\(/,
      /\bfree\s*\(/,
      /\bstruct\s+\w+\s*{/,
      /\btypedef\s+/,
      /\bsizeof\s*\(/,
      /#define\s+\w+/,
    ],
    weight: 0.9,
  },
  {
    language: 'C++',
    monacoId: 'cpp',
    patterns: [
      /#include\s*<iostream>/,
      /\bstd::/,
      /cout\s*<</,
      /cin\s*>>/,
      /\bclass\s+\w+\s*{/,
      /\bnamespace\s+\w+/,
      /\btemplate\s*</,
      /\bvirtual\s+/,
      /\bnew\s+\w+/,
      /\bvector<\w+>/,
      /using\s+namespace\s+std/,
    ],
    weight: 1.1,
  },
  {
    language: 'C#',
    monacoId: 'csharp',
    patterns: [
      /\busing\s+System/,
      /\bnamespace\s+\w+/,
      /\bConsole\.Write/,
      /\bpublic\s+(async\s+)?Task/,
      /\bvar\s+\w+\s*=\s*new\b/,
      /\bstring\[\]\s+args/,
      /\bget;\s*set;/,
      /\basync\s+Task/,
      /\bawait\s+/,
      /\bLINQ\b|\b\.Select\(|\b\.Where\(/,
    ],
    weight: 1,
  },
  {
    language: 'Go',
    monacoId: 'go',
    patterns: [
      /\bpackage\s+main\b/,
      /\bfunc\s+\w+\s*\(/,
      /\bfmt\.Print/,
      /\b:=\s*/,
      /\bgo\s+func/,
      /\bchan\s+\w+/,
      /\bdefer\s+/,
      /\bgoroutine\b/,
      /import\s*\(/,
      /\bfunc\s+\(\w+\s+\*?\w+\)/,
    ],
    weight: 1.1,
  },
  {
    language: 'Rust',
    monacoId: 'rust',
    patterns: [
      /\bfn\s+main\s*\(\)/,
      /\blet\s+mut\s+/,
      /\bprintln!\s*\(/,
      /\bimpl\s+\w+/,
      /\bpub\s+fn\b/,
      /\b->\s*(Self|&|i32|u32|String|bool)/,
      /\buse\s+std::/,
      /\bmatch\s+\w+\s*{/,
      /\bOption<\w+>/,
      /\bResult<\w+,\s*\w+>/,
    ],
    weight: 1.2,
  },
  {
    language: 'PHP',
    monacoId: 'php',
    patterns: [
      /<\?php/,
      /\$\w+\s*=/,
      /\becho\s+/,
      /\bfunction\s+\w+\s*\(\$/,
      /\b->\w+\s*\(/,
      /\bnew\s+\w+\s*\(/,
      /\bclass\s+\w+\s*(extends|implements)/,
      /\barray\s*\(/,
      /\brequire(_once)?\s*\(/,
      /\bnamespace\s+\w+/,
    ],
    weight: 1,
  },
  {
    language: 'Kotlin',
    monacoId: 'kotlin',
    patterns: [
      /\bfun\s+main\s*\(/,
      /\bfun\s+\w+\s*\(/,
      /\bval\s+\w+\s*[:=]/,
      /\bvar\s+\w+\s*[:=]/,
      /\bprintln\s*\(/,
      /\bdata\s+class\b/,
      /\bcompanion\s+object\b/,
      /\bwhen\s*\(\w+\)\s*{/,
      /\bsuspend\s+fun\b/,
      /\blateinit\s+var\b/,
    ],
    weight: 1.1,
  },
  {
    language: 'Swift',
    monacoId: 'swift',
    patterns: [
      /\bimport\s+Foundation\b/,
      /\bfunc\s+\w+\s*\(/,
      /\bvar\s+\w+\s*:\s*\w+/,
      /\blet\s+\w+\s*:\s*\w+/,
      /\bprint\s*\(/,
      /\bguard\s+let\b/,
      /\bstruct\s+\w+\s*{/,
      /\benum\s+\w+\s*{/,
      /\bprotocol\s+\w+\s*{/,
      /\bif\s+let\b/,
    ],
    weight: 1.1,
  },
  {
    language: 'Dart',
    monacoId: 'dart',
    patterns: [
      /\bvoid\s+main\s*\(\)/,
      /\bimport\s+'package:/,
      /\bclass\s+\w+\s+extends\s+\w+Widget/,
      /\b@override\b/,
      /\bWidget\s+build\b/,
      /\bfinal\s+\w+\s+\w+/,
      /\bFuture<\w+>/,
      /\basync\b.*\bawait\b/,
      /\bStatefulWidget\b|\bStatelessWidget\b/,
      /\bprint\s*\(/,
    ],
    weight: 1.1,
  },
  {
    language: 'Ruby',
    monacoId: 'ruby',
    patterns: [
      /\bdef\s+\w+/,
      /\bputs\s+/,
      /\brequire\s+'/,
      /\bclass\s+\w+\s*</,
      /\battr_(reader|writer|accessor)\b/,
      /\bend$/m,
      /\bdo\s*\|/,
      /\b\.each\s+do\b/,
      /\bmodule\s+\w+/,
      /\byield\b/,
    ],
    weight: 1,
  },
  {
    language: 'Lua',
    monacoId: 'lua',
    patterns: [
      /\bfunction\s+\w+\s*\(/,
      /\blocal\s+\w+\s*=/,
      /\bprint\s*\(/,
      /\bthen\s*$/m,
      /\bend$/m,
      /\brequire\s*\(/,
      /\brepeat\b/,
      /\buntil\b/,
      /\belseif\b/,
      /--\[\[/,
    ],
    weight: 0.9,
  },
  {
    language: 'Shell',
    monacoId: 'shell',
    patterns: [
      /^#!/m,
      /\becho\s+/,
      /\bif\s+\[\s/,
      /\bfi$/m,
      /\bdone$/m,
      /\bfor\s+\w+\s+in\b/,
      /\bwhile\s+\[\s/,
      /\bcase\s+.*\s+in$/m,
      /\besac$/m,
      /\$\{\w+\}/,
    ],
    weight: 0.8,
  },
  {
    language: 'HTML',
    monacoId: 'html',
    patterns: [
      /<!DOCTYPE\s+html>/i,
      /<html\b/,
      /<head\b/,
      /<body\b/,
      /<div\b/,
      /<script\b/,
      /<style\b/,
      /<link\b.*rel=/,
      /<meta\b/,
      /<\/\w+>/,
    ],
    weight: 0.7,
  },
  {
    language: 'CSS',
    monacoId: 'css',
    patterns: [
      /\.\w+\s*{/,
      /#\w+\s*{/,
      /@media\s+/,
      /\bbackground(-color)?:\s*/,
      /\bfont-(size|family|weight):\s*/,
      /\bdisplay:\s*(flex|grid|block|none)/,
      /\bmargin:\s*/,
      /\bpadding:\s*/,
      /@keyframes\s+/,
      /\b:hover\b/,
    ],
    weight: 0.7,
  },
  {
    language: 'SQL',
    monacoId: 'sql',
    patterns: [
      /\bSELECT\s+/i,
      /\bFROM\s+\w+/i,
      /\bWHERE\s+/i,
      /\bINSERT\s+INTO\b/i,
      /\bUPDATE\s+\w+\s+SET\b/i,
      /\bCREATE\s+TABLE\b/i,
      /\bJOIN\s+\w+\s+ON\b/i,
      /\bGROUP\s+BY\b/i,
      /\bORDER\s+BY\b/i,
      /\bALTER\s+TABLE\b/i,
    ],
    weight: 0.9,
  },
];

export function detectLanguage(code: string): LanguageMatch {
  if (!code || code.trim().length === 0) {
    return { language: 'Plain Text', monacoId: 'plaintext', confidence: 0 };
  }

  const scores: { language: string; monacoId: string; score: number }[] = [];

  for (const lang of LANGUAGE_PATTERNS) {
    let matchCount = 0;

    for (const pattern of lang.patterns) {
      if (pattern.test(code)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const rawScore = (matchCount / lang.patterns.length) * lang.weight;
      scores.push({
        language: lang.language,
        monacoId: lang.monacoId,
        score: rawScore,
      });
    }
  }

  if (scores.length === 0) {
    return { language: 'Plain Text', monacoId: 'plaintext', confidence: 20 };
  }

  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const confidence = Math.min(Math.round(best.score * 100), 99);

  return {
    language: best.language,
    monacoId: best.monacoId,
    confidence: Math.max(confidence, 30),
  };
}

export function getFileExtension(monacoId: string): string {
  const lang = LANGUAGE_PATTERNS.find((l) => l.monacoId === monacoId);
  if (!lang) return '.txt';

  const extMap: Record<string, string> = {
    python: '.py',
    javascript: '.js',
    typescript: '.ts',
    java: '.java',
    c: '.c',
    cpp: '.cpp',
    csharp: '.cs',
    go: '.go',
    rust: '.rs',
    php: '.php',
    kotlin: '.kt',
    swift: '.swift',
    dart: '.dart',
    ruby: '.rb',
    lua: '.lua',
    shell: '.sh',
    html: '.html',
    css: '.css',
    sql: '.sql',
  };

  return extMap[monacoId] || '.txt';
}

export function normalizeLanguageId(raw: string): string {
  const normalized = raw.toLowerCase().trim();

  const aliasMap: Record<string, string> = {
    py: 'python',
    js: 'javascript',
    ts: 'typescript',
    'c++': 'cpp',
    'c#': 'csharp',
    golang: 'go',
    bash: 'shell',
    sh: 'shell',
    zsh: 'shell',
    rb: 'ruby',
    kt: 'kotlin',
    rs: 'rust',
    text: 'plaintext',
    txt: 'plaintext',
    plain: 'plaintext',
    'plain text': 'plaintext',
  };

  return aliasMap[normalized] || normalized;
}
