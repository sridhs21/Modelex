# Modelex - Code Beautifier

<img src="assets/images/full_logo.png" alt="Code Beautifier Logo" width="400" height="400">

## Overview
Modelex is a VS Code extension that formats and beautifies your code for improved readability and consistency. It supports multiple programming languages and integrates seamlessly with VS Code's formatting capabilities.

## Features

- **Multi-language Support**: Formats JavaScript, TypeScript, JSON, HTML, CSS, Python, Java, C, and C++ files
- **Keyboard Shortcut**: Quickly beautify your code with a simple keyboard shortcut
- **Format on Save**: Option to automatically format your code when saving files
- **Language-Specific Formatting**: Custom formatting rules for each supported language
- **Indentation Preservation**: Maintains your existing indentation preferences
- **Comment Handling**: Properly formats and aligns comments without changing their content
- **Integration with VS Code**: Works with VS Code's built-in formatting capabilities

![Code Beautifier in Action](images/beautifier-demo.gif)

## Requirements

- Visual Studio Code 1.60.0 or higher

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Code Beautifier"
4. Click Install

## Usage

### Via Command Palette
1. Open a file you want to beautify
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
3. Type "Beautify" and select "Beautify Code"

### Via Keyboard Shortcut
The default keyboard shortcut is `Ctrl+Alt+B` (Windows/Linux) or `Cmd+Alt+B` (Mac).

### Via Context Menu
Right-click in the editor and select "Beautify Code" from the context menu.

## Extension Settings

This extension contributes the following settings:

* `codeBeautifier.enableFormatOnSave`: Enable/disable automatic formatting when saving files
* `codeBeautifier.formatOnSaveLanguages`: List of languages to format on save
* `codeBeautifier.insertSpaces`: Use spaces for indentation (follows VS Code editor settings if not specified)
* `codeBeautifier.tabSize`: Number of spaces per indentation level (follows VS Code editor settings if not specified)
* `codeBeautifier.braceStyle`: Brace style for C-family languages ("same-line" or "new-line")
* `codeBeautifier.preserveEmptyLines`: Controls whether to preserve empty lines in the code
* `codeBeautifier.maxEmptyLines`: Maximum number of consecutive empty lines to retain (default: 1)

## Supported Languages

- JavaScript
- TypeScript
- JSON
- HTML
- CSS
- Python
- Java
- C
- C++

## Known Issues

- Stream operators (`<<` and `>>`) in C++ might be incorrectly formatted with spaces between the brackets in some edge cases
- Multiple consecutive empty lines are condensed to a single empty line, which may not be desired in all cases
- Complex regex patterns in code may sometimes be incorrectly identified as operators

## Troubleshooting

If you encounter issues with formatting:

1. Check that the file language is correctly identified in the VS Code status bar
2. Try using the command palette to explicitly run the beautifier
3. Verify your settings in the VS Code settings editor

## Release Notes

### 1.0.0
- Initial release with support for JavaScript, TypeScript, JSON, HTML, CSS, Python, Java, C, and C++
- Code formatting with proper operator spacing and indentation
- Smart comment preservation and alignment
- Integration with VS Code's formatting capabilities
- Option to run via command palette, keyboard shortcut, or context menu

## License

This extension is licensed under the [MIT License](LICENSE).

---