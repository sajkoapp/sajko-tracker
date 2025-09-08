import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { diffLines } from 'diff';

export interface InjectionResult {
  success: boolean;
  filePath?: string;
  backup?: string;
  error?: string;
  diff?: string;
}

export class FileInjector {
  private backupDir = '.sajko-backups';

  /**
   * Inject SAJKO into Next.js App Router layout
   */
  async injectNextAppRouter(
    projectRoot: string,
    websiteId: string,
    typescript: boolean
  ): Promise<InjectionResult> {
    const layoutPaths = [
      'app/layout.tsx',
      'app/layout.js',
      'src/app/layout.tsx',
      'src/app/layout.js'
    ];

    for (const layoutPath of layoutPaths) {
      const fullPath = path.join(projectRoot, layoutPath);
      if (await fs.pathExists(fullPath)) {
        return this.injectIntoNextLayout(fullPath, websiteId, typescript);
      }
    }

    return {
      success: false,
      error: 'No Next.js app router layout file found'
    };
  }

  /**
   * Inject SAJKO into Next.js Pages Router _app
   */
  async injectNextPagesRouter(
    projectRoot: string,
    websiteId: string,
    typescript: boolean
  ): Promise<InjectionResult> {
    const appPaths = [
      'pages/_app.tsx',
      'pages/_app.js',
      'src/pages/_app.tsx',
      'src/pages/_app.js'
    ];

    for (const appPath of appPaths) {
      const fullPath = path.join(projectRoot, appPath);
      if (await fs.pathExists(fullPath)) {
        return this.injectIntoNextApp(fullPath, websiteId, typescript);
      }
    }

    // Create _app file if it doesn't exist
    const newAppPath = path.join(
      projectRoot,
      await fs.pathExists(path.join(projectRoot, 'src')) ? 'src/pages' : 'pages',
      typescript ? '_app.tsx' : '_app.js'
    );

    await this.createNextApp(newAppPath, websiteId, typescript);
    return {
      success: true,
      filePath: newAppPath,
      diff: 'Created new _app file'
    };
  }

  /**
   * Inject SAJKO into React app
   */
  async injectReact(
    projectRoot: string,
    websiteId: string,
    typescript: boolean
  ): Promise<InjectionResult> {
    const entryPaths = [
      'src/index.tsx',
      'src/index.js',
      'src/main.tsx',
      'src/main.js',
      'index.tsx',
      'index.js'
    ];

    for (const entryPath of entryPaths) {
      const fullPath = path.join(projectRoot, entryPath);
      if (await fs.pathExists(fullPath)) {
        return this.injectIntoReactEntry(fullPath, websiteId, typescript);
      }
    }

    return {
      success: false,
      error: 'No React entry file found'
    };
  }

  /**
   * Inject SAJKO into Vue app
   */
  async injectVue(
    projectRoot: string,
    websiteId: string,
    typescript: boolean
  ): Promise<InjectionResult> {
    const mainPaths = [
      'src/main.ts',
      'src/main.js',
      'main.ts',
      'main.js'
    ];

    for (const mainPath of mainPaths) {
      const fullPath = path.join(projectRoot, mainPath);
      if (await fs.pathExists(fullPath)) {
        return this.injectIntoVueMain(fullPath, websiteId);
      }
    }

    return {
      success: false,
      error: 'No Vue main file found'
    };
  }

  /**
   * Inject into vanilla HTML
   */
  async injectVanilla(
    projectRoot: string,
    websiteId: string
  ): Promise<InjectionResult> {
    const htmlPaths = [
      'index.html',
      'public/index.html',
      'src/index.html'
    ];

    for (const htmlPath of htmlPaths) {
      const fullPath = path.join(projectRoot, htmlPath);
      if (await fs.pathExists(fullPath)) {
        return this.injectIntoHtml(fullPath, websiteId);
      }
    }

    return {
      success: false,
      error: 'No HTML file found'
    };
  }

  private async injectIntoNextLayout(
    filePath: string,
    websiteId: string,
    typescript: boolean
  ): Promise<InjectionResult> {
    try {
      const backup = await this.createBackup(filePath);
      const code = await fs.readFile(filePath, 'utf-8');
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });

      let hasImport = false;
      let modified = false;

      // Add import statement
      traverse(ast, {
        Program(path) {
          const body = path.node.body;
          
          // Check if already imported
          hasImport = body.some(node => 
            t.isImportDeclaration(node) && 
            node.source.value === '@sajko/nextjs'
          );

          if (!hasImport) {
            const importDecl = t.importDeclaration(
              [t.importSpecifier(
                t.identifier('SajkoScript'),
                t.identifier('SajkoScript')
              )],
              t.stringLiteral('@sajko/nextjs')
            );
            
            // Insert after last import
            let lastImportIndex = -1;
            body.forEach((node, index) => {
              if (t.isImportDeclaration(node)) {
                lastImportIndex = index;
              }
            });
            
            body.splice(lastImportIndex + 1, 0, importDecl);
            modified = true;
          }
        },

        // Find the layout component and inject SajkoScript
        JSXElement(path) {
          if (path.node.openingElement.name &&
              t.isJSXIdentifier(path.node.openingElement.name) &&
              path.node.openingElement.name.name === 'html') {
            
            const bodyElement = path.node.children.find(child =>
              t.isJSXElement(child) &&
              t.isJSXIdentifier(child.openingElement.name) &&
              child.openingElement.name.name === 'body'
            );

            if (bodyElement && t.isJSXElement(bodyElement)) {
              // Check if SajkoScript already exists
              const hasSajko = bodyElement.children.some(child =>
                t.isJSXElement(child) &&
                t.isJSXIdentifier(child.openingElement.name) &&
                child.openingElement.name.name === 'SajkoScript'
              );

              if (!hasSajko) {
                // Create SajkoScript element
                const sajkoScript = t.jsxElement(
                  t.jsxOpeningElement(
                    t.jsxIdentifier('SajkoScript'),
                    [
                      t.jsxAttribute(
                        t.jsxIdentifier('config'),
                        t.jsxExpressionContainer(
                          t.objectExpression([
                            t.objectProperty(
                              t.identifier('websiteId'),
                              t.stringLiteral(websiteId)
                            )
                          ])
                        )
                      )
                    ],
                    true
                  ),
                  null,
                  [],
                  true
                );

                // Add to end of body
                bodyElement.children.push(sajkoScript);
                modified = true;
              }
            }
          }
        }
      });

      if (modified) {
        const output = generate(ast, {}, code);
        const newCode = output.code;
        
        // Generate diff
        const diff = this.generateDiff(code, newCode);
        
        await fs.writeFile(filePath, newCode);
        
        return {
          success: true,
          filePath,
          backup,
          diff
        };
      }

      return {
        success: false,
        error: 'SAJKO already integrated'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async injectIntoNextApp(
    filePath: string,
    websiteId: string,
    typescript: boolean
  ): Promise<InjectionResult> {
    try {
      const backup = await this.createBackup(filePath);
      const code = await fs.readFile(filePath, 'utf-8');
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });

      let modified = false;

      traverse(ast, {
        Program(path) {
          const body = path.node.body;
          
          // Add import if not exists
          const hasImport = body.some(node =>
            t.isImportDeclaration(node) &&
            node.source.value === '@sajko/nextjs'
          );

          if (!hasImport) {
            const importDecl = t.importDeclaration(
              [t.importSpecifier(
                t.identifier('SajkoScript'),
                t.identifier('SajkoScript')
              )],
              t.stringLiteral('@sajko/nextjs')
            );
            
            let lastImportIndex = -1;
            body.forEach((node, index) => {
              if (t.isImportDeclaration(node)) {
                lastImportIndex = index;
              }
            });
            
            body.splice(lastImportIndex + 1, 0, importDecl);
            modified = true;
          }
        },

        // Find MyApp component
        FunctionDeclaration(path) {
          if (path.node.id && path.node.id.name === 'MyApp') {
            injectSajkoIntoComponent(path, websiteId);
            modified = true;
          }
        },
        
        VariableDeclarator(path) {
          if (t.isIdentifier(path.node.id) && path.node.id.name === 'MyApp') {
            if (t.isArrowFunctionExpression(path.node.init) ||
                t.isFunctionExpression(path.node.init)) {
              injectSajkoIntoComponent(path.get('init'), websiteId);
              modified = true;
            }
          }
        }
      });

      function injectSajkoIntoComponent(path: any, websiteId: string) {
        const returnStatement = path.node.body.body.find(
          (node: any) => t.isReturnStatement(node)
        );

        if (returnStatement && t.isJSXElement(returnStatement.argument)) {
          const jsxElement = returnStatement.argument;
          
          // Create SajkoScript element
          const sajkoScript = t.jsxElement(
            t.jsxOpeningElement(
              t.jsxIdentifier('SajkoScript'),
              [
                t.jsxAttribute(
                  t.jsxIdentifier('config'),
                  t.jsxExpressionContainer(
                    t.objectExpression([
                      t.objectProperty(
                        t.identifier('websiteId'),
                        t.stringLiteral(websiteId)
                      )
                    ])
                  )
                )
              ],
              true
            ),
            null,
            [],
            true
          );

          // Create fragment wrapping both elements
          const fragment = t.jsxFragment(
            t.jsxOpeningFragment(),
            t.jsxClosingFragment(),
            [sajkoScript, jsxElement]
          );

          returnStatement.argument = fragment;
        }
      }

      if (modified) {
        const output = generate(ast, {}, code);
        const newCode = output.code;
        const diff = this.generateDiff(code, newCode);
        
        await fs.writeFile(filePath, newCode);
        
        return {
          success: true,
          filePath,
          backup,
          diff
        };
      }

      return {
        success: false,
        error: 'Could not inject SAJKO'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }


  private async injectIntoReactEntry(
    filePath: string,
    websiteId: string,
    typescript: boolean
  ): Promise<InjectionResult> {
    try {
      const backup = await this.createBackup(filePath);
      const code = await fs.readFile(filePath, 'utf-8');
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });

      let modified = false;

      traverse(ast, {
        Program(path) {
          const body = path.node.body;
          
          // Add import
          const hasImport = body.some(node =>
            t.isImportDeclaration(node) &&
            node.source.value === '@sajko/react'
          );

          if (!hasImport) {
            const importDecl = t.importDeclaration(
              [t.importSpecifier(
                t.identifier('SajkoProvider'),
                t.identifier('SajkoProvider')
              )],
              t.stringLiteral('@sajko/react')
            );
            
            let lastImportIndex = -1;
            body.forEach((node, index) => {
              if (t.isImportDeclaration(node)) {
                lastImportIndex = index;
              }
            });
            
            body.splice(lastImportIndex + 1, 0, importDecl);
            modified = true;
          }
        },

        // Wrap App with SajkoProvider
        CallExpression(path) {
          if (t.isMemberExpression(path.node.callee) &&
              t.isIdentifier(path.node.callee.property) &&
              path.node.callee.property.name === 'render') {
            
            const arg = path.node.arguments[0];
            if (t.isJSXElement(arg)) {
              // Wrap with SajkoProvider
              const provider = t.jsxElement(
                t.jsxOpeningElement(
                  t.jsxIdentifier('SajkoProvider'),
                  [
                    t.jsxAttribute(
                      t.jsxIdentifier('config'),
                      t.jsxExpressionContainer(
                        t.objectExpression([
                          t.objectProperty(
                            t.identifier('websiteId'),
                            t.stringLiteral(websiteId)
                          )
                        ])
                      )
                    )
                  ],
                  false
                ),
                t.jsxClosingElement(t.jsxIdentifier('SajkoProvider')),
                [arg],
                false
              );

              path.node.arguments[0] = provider;
              modified = true;
            }
          }
        }
      });

      if (modified) {
        const output = generate(ast, {}, code);
        const newCode = output.code;
        const diff = this.generateDiff(code, newCode);
        
        await fs.writeFile(filePath, newCode);
        
        return {
          success: true,
          filePath,
          backup,
          diff
        };
      }

      return {
        success: false,
        error: 'Could not inject SAJKO'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async injectIntoVueMain(
    filePath: string,
    websiteId: string
  ): Promise<InjectionResult> {
    try {
      const backup = await this.createBackup(filePath);
      const code = await fs.readFile(filePath, 'utf-8');
      
      // Check if already has SAJKO
      if (code.includes('@sajko/vue')) {
        return {
          success: false,
          error: 'SAJKO already integrated'
        };
      }

      // Find the app.mount line
      const mountMatch = code.match(/(app|application)\.mount\(['"`]#app['"`]\)/);
      if (!mountMatch) {
        return {
          success: false,
          error: 'Could not find Vue app mount point'
        };
      }

      // Add import
      let newCode = code;
      const lastImportMatch = code.match(/^import .* from ['"].*['"];?$/gm);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        const importStatement = `import { SajkoPlugin } from '@sajko/vue';`;
        newCode = newCode.replace(
          lastImport,
          `${lastImport}\n${importStatement}`
        );
      }

      // Add plugin use
      const pluginUse = `\napp.use(SajkoPlugin, {\n  websiteId: '${websiteId}'\n});\n`;
      newCode = newCode.replace(
        mountMatch[0],
        `${pluginUse}${mountMatch[0]}`
      );

      const diff = this.generateDiff(code, newCode);
      await fs.writeFile(filePath, newCode);

      return {
        success: true,
        filePath,
        backup,
        diff
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async injectIntoHtml(
    filePath: string,
    websiteId: string
  ): Promise<InjectionResult> {
    try {
      const backup = await this.createBackup(filePath);
      const code = await fs.readFile(filePath, 'utf-8');
      
      // Check if already has SAJKO
      if (code.includes('sajko-replay')) {
        return {
          success: false,
          error: 'SAJKO already integrated'
        };
      }

      // Find </body> tag
      const bodyCloseIndex = code.lastIndexOf('</body>');
      if (bodyCloseIndex === -1) {
        return {
          success: false,
          error: 'No </body> tag found'
        };
      }

      const sajkoScript = `
  <!-- SAJKO Analytics -->
  <script>
    window.sajkoConfig = {
      websiteId: '${websiteId}',
      debug: true
    };
  </script>
  <script src="https://cdn.sajko.app/v4/sajko-replay.js" async></script>
  `;

      const newCode = code.slice(0, bodyCloseIndex) + sajkoScript + code.slice(bodyCloseIndex);
      const diff = this.generateDiff(code, newCode);
      
      await fs.writeFile(filePath, newCode);

      return {
        success: true,
        filePath,
        backup,
        diff
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async createNextApp(
    filePath: string,
    websiteId: string,
    typescript: boolean
  ) {
    const content = typescript ? `
import type { AppProps } from 'next/app';
import { SajkoScript } from '@sajko/nextjs';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <SajkoScript config={{ websiteId: '${websiteId}' }} />
      <Component {...pageProps} />
    </>
  );
}
` : `
import { SajkoScript } from '@sajko/nextjs';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <SajkoScript config={{ websiteId: '${websiteId}' }} />
      <Component {...pageProps} />
    </>
  );
}
`;

    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
  }

  private async createBackup(filePath: string): Promise<string> {
    const backupPath = path.join(
      path.dirname(filePath),
      this.backupDir,
      `${path.basename(filePath)}.${Date.now()}.backup`
    );
    
    await fs.ensureDir(path.dirname(backupPath));
    await fs.copyFile(filePath, backupPath);
    
    return backupPath;
  }

  private generateDiff(oldCode: string, newCode: string): string {
    const diff = diffLines(oldCode, newCode);
    let result = '';
    
    diff.forEach(part => {
      const prefix = part.added ? chalk.green('+') :
                     part.removed ? chalk.red('-') : ' ';
      
      part.value.split('\n').forEach(line => {
        if (line) {
          result += `${prefix} ${line}\n`;
        }
      });
    });
    
    return result;
  }

  async rollback(backupPath: string, originalPath: string): Promise<void> {
    await fs.copyFile(backupPath, originalPath);
    await fs.remove(backupPath);
  }
}