import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Gets the appropriate comment syntax for a given language ID
 */
function getCommentSyntax(languageId: string): string {
  const commentMap: { [key: string]: string } = {
    // Single-line comments
    'javascript': '//',
    'typescript': '//',
    'javascriptreact': '//',
    'typescriptreact': '//',
    'c': '//',
    'cpp': '//',
    'csharp': '//',
    'java': '//',
    'go': '//',
    'rust': '//',
    'swift': '//',
    'kotlin': '//',
    'dart': '//',
    'scala': '//',
    
    // Hash comments
    'python': '#',
    'shellscript': '#',
    'bash': '#',
    'ruby': '#',
    'perl': '#',
    'yaml': '#',
    'yml': '#',
    'dockerfile': '#',
    'r': '#',
    'lua': '--',
    'sql': '--',
    
    // HTML/XML comments
    'html': '<!--',
    'xml': '<!--',
    
    // CSS comments
    'css': '/*',
    'scss': '//',
    'sass': '//',
    'less': '//',
  };

  return commentMap[languageId] || '//';
}

/**
 * Gets the closing comment syntax if needed (for multi-line comments)
 */
function getCommentClosing(languageId: string): string {
  if (languageId === 'html' || languageId === 'xml') {
    return ' -->';
  }
  if (languageId === 'css') {
    return ' */';
  }
  return '';
}

/**
 * Gets the Anthropic API key from VS Code settings
 */
function getApiKey(): string | undefined {
  const config = vscode.workspace.getConfiguration('brainrot');
  const apiKey = config.get<string>('apiKey');
  return apiKey && apiKey.trim() !== '' ? apiKey : undefined;
}

/**
 * Extracts code context from the editor selections
 * Returns the selected code text, limited to a reasonable size
 */
function extractCodeContext(editor: vscode.TextEditor): string {
  const document = editor.document;
  const maxContextLength = 2000;
  
  let contextText = '';
  
  editor.selections.forEach((selection) => {
    if (!selection.isEmpty) {
      // Get selected text
      const selectedText = document.getText(selection);
      if (contextText.length + selectedText.length <= maxContextLength) {
        contextText += (contextText ? '\n\n' : '') + selectedText;
      }
    } else {
      // If no selection, get the current line
      const line = selection.active.line;
      const lineText = document.lineAt(line).text.trim();
      if (lineText && contextText.length + lineText.length <= maxContextLength) {
        contextText += (contextText ? '\n\n' : '') + lineText;
      }
    }
  });
  
  // If still no context, get a few lines around the cursor
  if (!contextText && editor.selections.length > 0) {
    const firstSelection = editor.selections[0];
    const line = firstSelection.active.line;
    const startLine = Math.max(0, line - 2);
    const endLine = Math.min(document.lineCount - 1, line + 2);
    
    for (let i = startLine; i <= endLine; i++) {
      const lineText = document.lineAt(i).text;
      if (contextText.length + lineText.length <= maxContextLength) {
        contextText += (contextText ? '\n' : '') + lineText;
      }
    }
  }
  
  return contextText || 'code';
}

/**
 * Generates a brainrot comment using Claude API based on the code context
 */
async function generateBrainrotComment(codeContext: string, language: string): Promise<string> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('Anthropic API key not configured. Please set brainrot.apiKey in VS Code settings.');
  }
  
  const anthropic = new Anthropic({
    apiKey: apiKey,
  });
  
  const prompt = `You are a software commenter that generates short, gen-z and brainrot style given a code snippet. 

A "brainrot" comment is:
- Very short (ideally 1-10 words, max 20 words)
- Humorous, silly, or absurd
- Contextually relevant to the code
- In internet/slang style (like "no cap", "fr fr", "that's wild", "literally me", etc.)
- Should make developers chuckle

Generate a brainrot comment for this ${language} code:

\`\`\`${language}
${codeContext}
\`\`\`

Return ONLY the comment text itself, without any code comment syntax (no //, #, etc.). Just the raw text that would go inside a comment.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text.trim() 
      : '';
    
    if (!responseText) {
      throw new Error('Empty response from Claude API');
    }
    
    // Limit the response to 50 words max
    const words = responseText.split(/\s+/);
    const limitedText = words.slice(0, 50).join(' ');
    
    return limitedText;
  } catch (error: any) {
    if (error.status === 401) {
      throw new Error('Invalid Anthropic API key. Please check your brainrot.apiKey setting.');
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (error.message) {
      throw new Error(`API error: ${error.message}`);
    } else {
      throw new Error('Failed to generate comment. Please check your API key and try again.');
    }
  }
}

/**
 * Inserts a brainrot comment at the beginning of the current line
 */
async function addBrainrotComment() {
  const editor = vscode.window.activeTextEditor;
  
  if (!editor) {
    vscode.window.showWarningMessage('No active editor found');
    return;
  }

  const document = editor.document;
  const languageId = document.languageId;
  const commentSyntax = getCommentSyntax(languageId);
  const commentClosing = getCommentClosing(languageId);
  
  // Show loading indicator
  const progressOptions: vscode.ProgressOptions = {
    location: vscode.ProgressLocation.Notification,
    title: 'Generating brainrot comment...',
    cancellable: false
  };
  
  let commentText: string;
  
  try {
    // Extract code context
    const codeContext = extractCodeContext(editor);
    
    // Generate comment with progress indicator
    commentText = await vscode.window.withProgress(progressOptions, async () => {
      return await generateBrainrotComment(codeContext, languageId);
    });
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to generate comment';
    vscode.window.showErrorMessage(`Brainrot Comment: ${errorMessage}`);
    
    // Fallback to hardcoded comment
    commentText = 'Brainrot comment';
  }
  
  const fullComment = `${commentSyntax} ${commentText}${commentClosing}`;

  await editor.edit((editBuilder: vscode.TextEditorEdit) => {
    editor.selections.forEach((selection: vscode.Selection) => {
      const line = selection.active.line;
      const lineText = document.lineAt(line).text;
      
      // Find the indentation of the current line
      const indentationMatch = lineText.match(/^(\s*)/);
      const indentation = indentationMatch ? indentationMatch[1] : '';
      
      // Calculate the position at the beginning of the line (after indentation)
      const lineStart = new vscode.Position(line, 0);
      const insertPosition = new vscode.Position(line, indentation.length);
      
      // Insert the comment
      editBuilder.insert(insertPosition, fullComment);
    });
  });
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('brainrot.addComment', addBrainrotComment);
  context.subscriptions.push(disposable);
}

export function deactivate() {}

