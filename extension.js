const vscode = require('vscode');

function activate(context) {
    console.log('Code Beautifier extension is now active!');

    // Register the beautify command
    const beautifyCommand = vscode.commands.registerCommand('code-beautifier.beautify', async function () {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            vscode.window.showInformationMessage('No editor is active');
            return;
        }

        try {
            const document = editor.document;
            const fullText = document.getText();
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(fullText.length)
            );
            
            // Get the language ID to determine formatting rules
            const languageId = document.languageId;
            
            // Format the text based on language
            const formattedText = formatCode(fullText, languageId);
            
            // Replace the text in the editor
            await editor.edit(editBuilder => {
                editBuilder.replace(fullRange, formattedText);
            });
            
            vscode.window.showInformationMessage('Code beautified successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Beautification failed: ${error.message}`);
            console.error(error);
        }
    });

    // Register as a formatting provider for supported languages
    const supportedLanguages = ['javascript', 'typescript', 'json', 'html', 'css', 'python', 'java', 'c', 'cpp'];
    
    const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
        supportedLanguages,
        {
            provideDocumentFormattingEdits(document) {
                const fullText = document.getText();
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(fullText.length)
                );
                
                try {
                    const formattedText = formatCode(fullText, document.languageId);
                    return [new vscode.TextEdit(fullRange, formattedText)];
                } catch (error) {
                    vscode.window.showErrorMessage(`Formatting failed: ${error.message}`);
                    return [];
                }
            }
        }
    );

    context.subscriptions.push(beautifyCommand, formattingProvider);
}

function formatCode(text, languageId) {
    // Get indentation settings from VS Code
    const editorConfig = vscode.workspace.getConfiguration('editor');
    const insertSpaces = editorConfig.get('insertSpaces', true);
    const tabSize = editorConfig.get('tabSize', 4);
    const indentChar = insertSpaces ? ' '.repeat(tabSize) : '\t';
    
    // Get extension-specific settings
    const beautifierConfig = vscode.workspace.getConfiguration('codeBeautifier');
    
    let formattedText;
    
    switch (languageId) {
        case 'javascript':
        case 'typescript':
        case 'json':
            formattedText = formatJavaScriptFamily(text, indentChar);
            break;
        case 'html':
            formattedText = formatHTML(text, indentChar);
            break;
        case 'css':
            formattedText = formatCSS(text, indentChar);
            break;
        case 'python':
            formattedText = formatPython(text, indentChar);
            break;
        case 'java':
        case 'c':
        case 'cpp':
            formattedText = formatCFamily(text, indentChar, languageId);
            break;
        default:
            throw new Error(`Unsupported language: ${languageId}`);
    }
    
    // Normalize line endings and reduce multiple consecutive empty lines to one
    formattedText = normalizeEmptyLines(formattedText);
    
    return formattedText;
}

// Function to normalize empty lines - reduce multiple consecutive empty lines to one
function normalizeEmptyLines(text) {
    // Replace 2 or more consecutive newlines with just one newline
    return text.replace(/\n{3,}/g, '\n\n');
}

function formatJavaScriptFamily(text, indent) {
    // Split the input into lines
    const lines = text.split('\n');
    let result = [];
    
    // Track original indentation
    let indentMap = new Map();
    
    // First pass: Determine the original indentation level of each line and clean up
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Preserve empty lines
        if (trimmedLine === '') {
            result.push('');
            continue;
        }
        
        // Calculate original indentation level
        const originalIndent = line.length - line.trimLeft().length;
        indentMap.set(i, Math.floor(originalIndent / 2)); // Assuming 2 spaces per indent level
        
        // Clean up the line's internal spacing without changing structure
        let cleaned = cleanupJSLine(trimmedLine);
        
        // Reconstruct the line with original indentation
        result.push(indent.repeat(indentMap.get(i)) + cleaned);
    }
    
    // Second pass: Ensure proper spacing between functions
    result = ensureFunctionSpacing(result, 'javascript');
    
    return result.join('\n');
}

// Helper function to clean up a JavaScript line's internal spacing
function cleanupJSLine(line) {
    // Handle comments
    const commentIndex = findJSCommentIndex(line);
    if (commentIndex === 0) {
        // Line is just a comment - preserve it exactly but normalize internal spacing
        return line.replace(/\/\/\s+/, '// ').replace(/\s{2,}/g, ' ');
    }
    
    // Split line into code and comment if needed
    let code = commentIndex > 0 ? line.substring(0, commentIndex).trim() : line;
    const comment = commentIndex > 0 ? line.substring(commentIndex) : '';
    
    // Fix spacing around operators
    let cleaned = code.replace(/\s*([=+\-*/%&|^<>!?:])\s*/g, ' $1 ');
    
    // Fix double operators (==, !=, ===, etc.)
    cleaned = cleaned.replace(/=\s+=\s+=/g, '===');
    cleaned = cleaned.replace(/=\s+=/g, '==');
    cleaned = cleaned.replace(/!\s+=/g, '!=');
    
    // Fix spacing around parentheses and brackets
    cleaned = cleaned.replace(/\(\s+/g, '(');
    cleaned = cleaned.replace(/\s+\)/g, ')');
    cleaned = cleaned.replace(/\[\s+/g, '[');
    cleaned = cleaned.replace(/\s+\]/g, ']');
    cleaned = cleaned.replace(/\{\s+/g, '{ ');
    cleaned = cleaned.replace(/\s+\}/g, ' }');
    
    // Fix spacing after commas and semicolons
    cleaned = cleaned.replace(/,\s*/g, ', ');
    cleaned = cleaned.replace(/;\s*/g, '; ');
    
    // Fix spacing around colons in objects
    cleaned = cleaned.replace(/(\w+)\s*:\s*/g, '$1: ');
    
    // Clean up multiple spaces
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    
    // Add back any comment with normalized spacing
    return cleaned + (comment ? ' ' + comment.replace(/\/\/\s+/, '// ').replace(/\s{2,}/g, ' ') : '');
}

// Helper function to find comment index in JavaScript code
function findJSCommentIndex(line) {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inRegex = false;
    
    for (let i = 0; i < line.length - 1; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        const prevChar = i > 0 ? line[i - 1] : '';
        
        // Skip string content
        if (char === "'" && prevChar !== '\\') {
            inSingleQuote = !inSingleQuote;
            continue;
        } else if (char === '"' && prevChar !== '\\') {
            inDoubleQuote = !inDoubleQuote;
            continue;
        } else if (char === '/' && prevChar === '(' && !inSingleQuote && !inDoubleQuote) {
            // Possible regex start
            inRegex = true;
            continue;
        } else if (char === '/' && inRegex && prevChar !== '\\') {
            // Regex end
            inRegex = false;
            continue;
        }
        
        // Only look for comments outside of strings and regex
        if (!inSingleQuote && !inDoubleQuote && !inRegex) {
            // Line comment //
            if (char === '/' && nextChar === '/') {
                return i;
            }
            
            // Block comment /*
            if (char === '/' && nextChar === '*') {
                return i;
            }
        }
    }
    
    return -1;
}

function formatHTML(text, indent) {
    // Split the input into lines
    const lines = text.split('\n');
    let result = [];
    
    // Track original indentation and element structure
    let indentMap = new Map();
    
    // First pass: Determine the original indentation of each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Preserve empty lines
        if (trimmedLine === '') {
            result.push('');
            continue;
        }
        
        // Calculate original indentation level
        const originalIndent = line.length - line.trimLeft().length;
        indentMap.set(i, Math.floor(originalIndent / 2)); // Assuming 2 spaces per indent level
        
        // Clean up the line's internal spacing without changing structure
        let cleaned = cleanupHTMLLine(trimmedLine);
        
        // Reconstruct the line with original indentation
        result.push(indent.repeat(indentMap.get(i)) + cleaned);
    }
    
    return result.join('\n');
}

// Helper function to clean up an HTML line's internal spacing
function cleanupHTMLLine(line) {
    // Preserve comment lines exactly
    if (line.startsWith('<!--') || line.includes('-->')) {
        return line;
    }
    
    // Fix spacing in tags: <tag attr = "value"> -> <tag attr="value">
    let cleaned = line.replace(/\s*=\s*/g, '=');
    
    // Fix spacing after tag names: <div  class...> -> <div class...>
    cleaned = cleaned.replace(/<([a-zA-Z0-9]+)\s+/g, '<$1 ');
    
    // Fix closing tags: < / div> -> </div>
    cleaned = cleaned.replace(/<\s*\/\s*/g, '</');
    
    // Fix self-closing tags: <br  /> -> <br />
    cleaned = cleaned.replace(/\s+\/>/g, ' />');
    
    // Clean up spaces between attributes
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    
    return cleaned;
}

function formatCSS(text, indent) {
    // Split the input into lines
    const lines = text.split('\n');
    let result = [];
    
    // Track original indentation
    let indentMap = new Map();
    
    // First pass: Determine the original indentation of each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Preserve empty lines
        if (trimmedLine === '') {
            result.push('');
            continue;
        }
        
        // Calculate original indentation level
        const originalIndent = line.length - line.trimLeft().length;
        indentMap.set(i, Math.floor(originalIndent / 2)); // Assuming 2 spaces per indent level
        
        // Clean up the line's internal spacing without changing structure
        let cleaned = cleanupCSSLine(trimmedLine);
        
        // Reconstruct the line with original indentation
        result.push(indent.repeat(indentMap.get(i)) + cleaned);
    }
    
    // Second pass: Ensure proper spacing between CSS blocks
    result = ensureCSSBlockSpacing(result);
    
    return result.join('\n');
}

// Helper function to ensure proper spacing between CSS blocks
function ensureCSSBlockSpacing(lines) {
    let result = [];
    let inBlock = false;
    let blockEndIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Track block starts and ends
        if (line.includes('{')) {
            inBlock = true;
        } else if (line.includes('}')) {
            inBlock = false;
            blockEndIndex = i;
        }
        
        // Add the current line
        result.push(lines[i]);
        
        // If we just ended a block, ensure proper spacing before the next block
        if (blockEndIndex === i) {
            // Look ahead to find the next block start
            let commentCount = 0;
            let j = i + 1;
            
            // Skip empty lines
            while (j < lines.length && lines[j].trim() === '') {
                j++;
            }
            
            // Count comment lines
            while (j < lines.length && (lines[j].trim().startsWith('/*') || lines[j].trim().startsWith('//'))) {
                commentCount++;
                j++;
                
                // Skip empty lines between comments
                while (j < lines.length && lines[j].trim() === '') {
                    j++;
                }
            }
            
            // Calculate needed newlines: 2 newlines + comment count
            const neededNewlines = 2 + commentCount;
            
            // Count existing newlines
            let existingNewlines = 0;
            for (let k = i + 1; k < j && k < lines.length; k++) {
                if (lines[k].trim() === '') {
                    existingNewlines++;
                }
            }
            
            // Add additional newlines if needed
            if (j < lines.length && existingNewlines < neededNewlines) {
                for (let k = 0; k < neededNewlines - existingNewlines; k++) {
                    result.push('');
                }
            }
        }
    }
    
    return result;
}

// Helper function to check if a line is a comment
function isCommentLine(line, language) {
    const trimmedLine = line.trim();
    
    switch (language) {
        case 'javascript':
        case 'java':
        case 'c':
        case 'cpp':
            return trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.endsWith('*/');
        case 'python':
            return trimmedLine.startsWith('#');
        default:
            return false;
    }
}

// Helper function to preserve comment indentation
function preserveCommentIndentation(commentLine, codeLineIndent) {
    // If the comment is on its own line (not trailing), align it with the code that follows
    if (commentLine.trim().startsWith('//')) {
        // Extract the comment content
        const commentContent = commentLine.trim().substring(2).trim();
        // Return the comment with the same indentation as the code line
        return codeLineIndent + '// ' + commentContent;
    }
    return commentLine;
}

// Helper function to clean up a CSS line's internal spacing
function cleanupCSSLine(line) {
    // Preserve comment lines
    if (line.startsWith('/*') || line.endsWith('*/')) {
        return line;
    }
    
    // Fix spacing around colons and semicolons in properties
    let cleaned = line.replace(/\s*:\s*/g, ': ');
    cleaned = cleaned.replace(/\s*;\s*/g, '; ');
    
    // Fix spacing around braces
    cleaned = cleaned.replace(/\s*{\s*/g, ' {');
    cleaned = cleaned.replace(/\s*}\s*/g, '}');
    
    // Fix spacing around commas in selectors or values
    cleaned = cleaned.replace(/\s*,\s*/g, ', ');
    
    // Clean up multiple spaces
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    
    return cleaned;
}

function formatPython(text, indent) {
    // Split the input into lines
    const lines = text.split('\n');
    let result = [];
    
    // Track original indentation
    let indentMap = new Map();
    
    // First pass: Determine the original indentation level of each line and clean up
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Preserve empty lines
        if (trimmedLine === '') {
            result.push('');
            continue;
        }
        
        // Calculate original indentation level by counting leading spaces
        const originalIndent = line.length - line.trimLeft().length;
        indentMap.set(i, Math.floor(originalIndent / 4)); // Assuming 4 spaces per indent level
        
        // Handle comment-only lines - preserve them exactly
        if (trimmedLine.startsWith('#')) {
            result.push(indent.repeat(Math.floor(originalIndent / 4)) + trimmedLine);
            continue;
        }
        
        // Split line into code and comment
        let codePart = trimmedLine;
        let commentPart = '';
        
        const commentIndex = findCommentIndex(trimmedLine);
        if (commentIndex !== -1) {
            codePart = trimmedLine.substring(0, commentIndex).trim();
            commentPart = trimmedLine.substring(commentIndex);
        }
        
        // Fix specific Python syntax issues without changing logic
        codePart = cleanupPythonCode(codePart);
        
        // Reconstruct the line with proper indentation preserved
        const indentLevel = indentMap.get(i);
        result.push(indent.repeat(indentLevel) + codePart + (commentPart ? ' ' + commentPart : ''));
    }
    
    // Second pass: Ensure proper spacing between functions
    result = ensureFunctionSpacing(result, 'python');
    
    return result.join('\n');
}

// Helper function to find the index of a comment that's not inside a string
function findCommentIndex(line) {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const prevChar = i > 0 ? line[i-1] : '';
        
        if (char === "'" && prevChar !== '\\') {
            inSingleQuote = !inSingleQuote;
        } else if (char === '"' && prevChar !== '\\') {
            inDoubleQuote = !inDoubleQuote;
        } else if (char === '#' && !inSingleQuote && !inDoubleQuote) {
            return i;
        }
    }
    
    return -1;
}

// Helper function to clean up Python code syntax without changing logic
function cleanupPythonCode(code) {
    // Fix spacing around operators
    let cleaned = code.replace(/\s*([=+\-*/<>:,()])\s*/g, ' $1 ');
    
    // Fix spacing after keywords
    cleaned = cleaned.replace(/(if|for|while|def|return|else|elif)\s+/g, '$1 ');
    
    // Fix function calls
    cleaned = cleaned.replace(/(\w+)\s*\(\s*/g, '$1(');
    cleaned = cleaned.replace(/\s*\)\s*/g, ')');
    
    // Fix double spaces
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    
    // Fix spacing around colons
    cleaned = cleaned.replace(/\s+:/g, ':');
    
    // Fix compound assignment operators
    cleaned = cleaned.replace(/(\w+)\s+\+\s+=\s+(\w+)/g, '$1 += $2');
    cleaned = cleaned.replace(/(\w+)\s+\*\s+=\s+(\w+)/g, '$1 *= $2');
    
    // Fix equality operators
    cleaned = cleaned.replace(/=\s+=\s+/g, '== ');
    
    return cleaned.trim();
}

// This is the completely rewritten function for the C-family languages
function formatCFamily(text, indent, language) {
    // Split into lines for processing
    const lines = text.split('\n');
    let result = [];
    
    // Track brace level for proper indentation
    let braceLevel = 0;
    
    // Track consecutive empty lines
    let emptyLineCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Handle empty lines
        if (trimmedLine === '') {
            // Only add one empty line if we encounter consecutive empty lines
            if (emptyLineCount < 1) {
                result.push('');
                emptyLineCount++;
            }
            continue;
        } else {
            // Reset empty line counter when we hit non-empty line
            emptyLineCount = 0;
        }
        
        // Handle preprocessor directives - no indentation
        if (trimmedLine.startsWith('#')) {
            result.push(trimmedLine);
            continue;
        }
        
        // Calculate indentation based on braces
        let currentIndentLevel = braceLevel;
        
        // Adjust indentation for closing braces on their own line
        if (trimmedLine === '}' || trimmedLine.startsWith('} ')) {
            currentIndentLevel--;
        }
        
        // Clean up the line's internal spacing without changing structure
        let cleaned = cleanupCFamilyLine(trimmedLine, language);
        
        // Add line with proper indentation
        result.push(indent.repeat(Math.max(0, currentIndentLevel)) + cleaned);
        
        // Update brace level for next line by counting braces in the current line
        for (const char of trimmedLine) {
            if (char === '{') {
                braceLevel++;
            } else if (char === '}') {
                braceLevel = Math.max(0, braceLevel - 1); // Prevent negative levels
            }
        }
    }
    
    // Second pass: Ensure proper spacing between methods/functions
    result = ensureMethodSpacing(result, language);
    
    return result.join('\n');
}

// Helper function to ensure proper spacing between methods (not top-level functions)
function ensureMethodSpacing(lines, language) {
    let result = [];
    let methodEndIndices = [];
    let methodStartIndices = [];
    
    // Language-specific method detection patterns
    let methodStartPattern;
    switch (language) {
        case 'java':
            methodStartPattern = /^\s*(public|private|protected)?\s*(static)?\s*\w+\s+\w+\s*\(/;
            break;
        case 'c':
        case 'cpp':
            methodStartPattern = /^\s*(\w+\s+)+\w+\s*\([^)]*\)\s*{/;
            break;
        default:
            methodStartPattern = /^\s*(\w+\s+)+\w+\s*\(/; // Default pattern
    }
    
    // First pass: Identify method boundaries
    let inMethod = false;
    let braceCount = 0;
    let currentMethodStart = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for method declarations
        if (methodStartPattern.test(line) && !inMethod) {
            inMethod = true;
            currentMethodStart = i;
            methodStartIndices.push(i);
        }
        
        // Count braces to track method scope
        if (inMethod) {
            for (const char of line) {
                if (char === '{') {
                    braceCount++;
                } else if (char === '}') {
                    braceCount--;
                    
                    // Method ended
                    if (braceCount === 0) {
                        inMethod = false;
                        methodEndIndices.push(i);
                        break;
                    }
                }
            }
        }
    }
    
    // Handle case where the last method extends to the end of file
    if (inMethod) {
        methodEndIndices.push(lines.length - 1);
    }
    
    // No methods found, return original lines but with comment spacing fixed
    if (methodStartIndices.length === 0) {
        return lines.map(line => {
            if (line.trim().startsWith('//')) {
                // Fix comment spacing - ensure only one space after comment marker
                return line.replace(/\/\/\s+/, '// ').replace(/\s{2,}/g, ' ');
            }
            return line;
        });
    }
    
    // Process lines, fixing comment spacing and method organization
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        
        // Fix comment spacing in all lines
        let fixedLine = line;
        if (line.trim().startsWith('//')) {
            fixedLine = line.replace(/^(\s*)\/\/\s+/, '$1// ').replace(/\s{2,}/g, ' ');
        }
        
        // Check if this is a blank line between closing braces - remove it
        if (line.trim() === '' && i > 0 && i < lines.length - 1) {
            const prevLine = lines[i-1].trim();
            const nextLine = lines[i+1].trim();
            if (prevLine.endsWith('}') && nextLine.endsWith('}')) {
                // Skip this blank line
                i++;
                continue;
            }
        }
        
        result.push(fixedLine);
        i++;
    }
    
    // Make a second pass to remove blank lines between comments and following code
    // and align standalone comments with their following code
    let finalResult = [];
    i = 0;
    while (i < result.length) {
        const line = result[i];
        
        // Check if this is a standalone comment
        if (line.trim().startsWith('//') && i + 1 < result.length) {
            // Find the next non-empty line
            let nextLineIndex = i + 1;
            while (nextLineIndex < result.length && result[nextLineIndex].trim() === '') {
                nextLineIndex++;
            }
            
            if (nextLineIndex < result.length) {
                // Get indentation of the following code
                const nextLine = result[nextLineIndex];
                const nextLineIndent = nextLine.length - nextLine.trimStart().length;
                const nextLineIndentStr = nextLine.substring(0, nextLineIndent);
                
                // Align the comment with the code's indentation
                const alignedComment = preserveCommentIndentation(line, nextLineIndentStr);
                finalResult.push(alignedComment);
                
                // Skip any blank lines between comment and code
                i = nextLineIndex === i + 1 ? i + 1 : nextLineIndex;
            } else {
                finalResult.push(line);
                i++;
            }
        } else {
            finalResult.push(line);
            i++;
        }
    }
    
    return finalResult;
}

// Helper function to clean up a line of C-family code
function cleanupCFamilyLine(line, language) {
    // Find comment index not inside string
    const commentIndex = findCFamilyCommentIndex(line);
    
    // Split into code and comment
    let code = commentIndex === -1 ? line : line.substring(0, commentIndex).trim();
    const comment = commentIndex === -1 ? '' : line.substring(commentIndex);
    
    if (code === '') {
        // Fix comment spacing - ensure only one space after comment marker and between words
        return comment.replace(/\/\/\s+/, '// ').replace(/\s{2,}/g, ' ');
    }
    
    // First, pre-process for C++ stream operators to protect them
    code = code.replace(/<<|>>/g, match => {
        return match === '<<' ? '__STREAM_OUT__' : '__STREAM_IN__';
    });
    
    // Fix spacing around operators
    let cleaned = code.replace(/\s*([=+\-*/%&|^<>!?:;,])\s*/g, ' $1 ');
    
    // Fix spacing around parentheses, brackets, and braces
    cleaned = cleaned.replace(/\s*\(\s*/g, '(');
    cleaned = cleaned.replace(/\s*\)\s*/g, ')');
    cleaned = cleaned.replace(/\s*\[\s*/g, '[');
    cleaned = cleaned.replace(/\s*\]\s*/g, ']');
    cleaned = cleaned.replace(/\[\s*\]/g, '[]'); // Fix empty array brackets
    
    // Keep space before opening brace but not after
    cleaned = cleaned.replace(/\s*{/g, ' {');
    cleaned = cleaned.replace(/{\s+/g, '{ ');
    
    // Space before closing brace
    cleaned = cleaned.replace(/\s*}/g, ' }');
    
    // Fix spacing after keywords
    cleaned = cleaned.replace(/(if|for|while|switch|return|break|continue|else|try|catch|finally)\s*\(/g, '$1 (');
    
    // Fix double spaces
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    
    // Restore C++ stream operators
    cleaned = cleaned.replace(/__STREAM_OUT__/g, '<<');
    cleaned = cleaned.replace(/__STREAM_IN__/g, '>>');
    
    // Fix comment spacing - ensure only one space after comment marker and between words
    const formattedComment = comment ? comment.replace(/\/\/\s+/, '// ').replace(/\s{2,}/g, ' ') : '';
    
    // Add appropriate comment spacing
    return cleaned.trim() + (formattedComment ? ' ' + formattedComment : '');
}

// Helper function to find comment index in C family code that is not inside a string
function findCFamilyCommentIndex(line) {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    
    for (let i = 0; i < line.length - 1; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        const prevChar = i > 0 ? line[i - 1] : '';
        
        if (char === "'" && prevChar !== '\\') {
            inSingleQuote = !inSingleQuote;
        } else if (char === '"' && prevChar !== '\\') {
            inDoubleQuote = !inDoubleQuote;
        } else if (!inSingleQuote && !inDoubleQuote) {
            // Line comment //
            if (char === '/' && nextChar === '/') {
                return i;
            }
            
            // Block comment /*
            if (char === '/' && nextChar === '*') {
                return i;
            }
        }
    }
    
    return -1;
}

// Helper function to ensure proper spacing between functions
function ensureFunctionSpacing(lines, language) {
    let result = [];
    let functionEndLineIndices = []; // Store indices of last lines of functions
    let functionStartLineIndices = []; // Store indices of first lines of functions
    
    // First pass: Identify function boundaries
    // Pattern to identify function declarations based on language
    let functionStartPattern;
    switch (language) {
        case 'javascript':
            functionStartPattern = /^(function\s+\w+|const\s+\w+\s*=\s*function|const\s+\w+\s*=\s*\(.*\)\s*=>)/;
            break;
        case 'python':
            functionStartPattern = /^def\s+\w+\s*\(/;
            break;
        default:
            functionStartPattern = /^function/; // Default pattern
    }
    
    // Find all function start and end points
    let inFunction = false;
    let currentFunctionStartIndex = -1;
    let currentIndentLevel = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for function declarations
        if (functionStartPattern.test(line) && !inFunction) {
            inFunction = true;
            currentFunctionStartIndex = i;
            functionStartLineIndices.push(i);
            
            // Determine initial indentation level
            if (language === 'python') {
                currentIndentLevel = (lines[i].length - lines[i].trimStart().length) / 4; // Python indentation
            }
        }
        
        // Check for function end
        if (inFunction) {
            // For JavaScript, look for closing brace at original indentation
            if (language === 'javascript' && line === '}') {
                inFunction = false;
                functionEndLineIndices.push(i);
            } 
            // For Python, detect function end by indentation change
            else if (language === 'python' && i < lines.length - 1) {
                const nextLine = lines[i + 1].trim();
                if (nextLine !== '') {
                    const nextIndent = (lines[i + 1].length - lines[i + 1].trimStart().length) / 4;
                    if (nextIndent <= currentIndentLevel) {
                        // Next line is not indented or at same level, function ended
                        inFunction = false;
                        functionEndLineIndices.push(i);
                    }
                }
            }
        }
    }
    
    // Handle last function if it's at the end of the file
    if (inFunction) {
        functionEndLineIndices.push(lines.length - 1);
    }
    
    // First pass: Fix comment formatting and remove unnecessary blank lines
    let fixedLines = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Fix comment spacing - normalize comment spacing and whitespace between words
        if (line.trim().startsWith('//')) {
            line = line.replace(/^(\s*)\/\/\s+/, '$1// ').replace(/\s{2,}/g, ' ');
        }
        
        // Skip blank lines between closing braces
        if (line.trim() === '' && i > 0 && i < lines.length - 1) {
            const prevLine = lines[i-1].trim();
            const nextLine = lines[i+1].trim();
            if (prevLine.endsWith('}') && nextLine.endsWith('}')) {
                continue;
            }
        }
        
        fixedLines.push(line);
    }
    
    // Second pass: Remove blank lines between comments and following code
    for (let i = 0; i < fixedLines.length; i++) {
        const line = fixedLines[i];
        
        // Check if this is a standalone comment
        if (line.trim().startsWith('//') && i + 1 < fixedLines.length) {
            // Find the next non-empty line
            let nextLineIndex = i + 1;
            while (nextLineIndex < fixedLines.length && fixedLines[nextLineIndex].trim() === '') {
                nextLineIndex++;
            }
            
            if (nextLineIndex < fixedLines.length) {
                // Get indentation of the following code
                const nextLine = fixedLines[nextLineIndex];
                const nextLineIndent = nextLine.length - nextLine.trimStart().length;
                const nextLineIndentStr = nextLine.substring(0, nextLineIndent);
                
                // Align the comment with the code's indentation
                const alignedComment = preserveCommentIndentation(line, nextLineIndentStr);
                result.push(alignedComment);
                
                // Skip any blank lines between comment and code
                i = nextLineIndex - 1; 
            } else {
                result.push(line);
            }
        } else {
            result.push(line);
        }
    }
    
    return result;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}