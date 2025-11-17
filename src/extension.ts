import * as vscode from 'vscode';

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
 * Inserts a brainrot comment at the beginning of the current line
 */
function addBrainrotComment() {
  const editor = vscode.window.activeTextEditor;
  
  if (!editor) {
    vscode.window.showWarningMessage('No active editor found');
    return;
  }

  const document = editor.document;
  const languageId = document.languageId;
  const commentSyntax = getCommentSyntax(languageId);
  const commentClosing = getCommentClosing(languageId);
  const commentText = 'Brainrot comment';
  const fullComment = `${commentSyntax} ${commentText}${commentClosing}`;

  editor.edit((editBuilder: vscode.TextEditorEdit) => {
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

