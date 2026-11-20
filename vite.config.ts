import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { marked, Marked } from 'marked';
import { defineConfig } from 'vite';
import { renderLegislatorList } from './scripts/render-legislators.ts';

const contentDirectory = fileURLToPath(new URL('./content/', import.meta.url));
const dataDirectory = fileURLToPath(new URL('./data/', import.meta.url));
const shellFile = fileURLToPath(new URL('./index.html', import.meta.url));
const pagePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

async function pageNames() {
  return (await readdir(contentDirectory)).filter((name) =>
    pagePattern.test(name),
  );
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character]!;
  });
}

function replaceSection(shell: string, name: string, content: string) {
  const marker = `<!-- ${name} -->`;
  const startMarker = `<!-- ${name}:start -->`;
  const endMarker = `<!-- ${name}:end -->`;
  const section = `${startMarker}\n${content}\n${endMarker}`;
  if (shell.includes(marker)) {
    return shell.replace(marker, () => section);
  }
  const start = shell.indexOf(startMarker);
  const end = shell.indexOf(endMarker, start);
  if (start === -1 || end === -1) {
    throw new Error(`HTML shell must contain ${marker}`);
  }
  return shell.slice(0, start) + section + shell.slice(end + endMarker.length);
}

async function renderPage(shell: string, name: string) {
  const markdown = await readFile(`${contentDirectory}/${name}`, 'utf8');
  const heading = marked
    .lexer(markdown)
    .find((token) => token.type === 'heading' && token.depth === 1);
  if (!heading || heading.type !== 'heading') {
    throw new Error(
      `${name} must contain a level-one heading for its page title`,
    );
  }
  const sections: { id: string; text: string }[] = [];
  const usedIds = new Set<string>();
  const parser = new Marked({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser
          .parseInline(tokens, this.parser.textRenderer)
          .replace(/<[^>]*>/g, '');
        const base =
          text
            .normalize('NFKD')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, '-')
            .replace(/^-|-$/g, '') || 'section';
        let id = base;
        for (let suffix = 2; usedIds.has(id); suffix++)
          id = `${base}-${suffix}`;
        usedIds.add(id);
        if (depth > 1) sections.push({ id, text });
        return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
    },
  });
  let content = parser.parse(markdown, { async: false });
  for (const chamber of ['senate', 'assembly'] as const) {
    const marker = `<!-- legislators:${chamber} -->`;
    if (content.includes(marker)) {
      const list = await renderLegislatorList(chamber);
      content = content.replaceAll(marker, () => list);
    }
  }
  const toc = sections.length
    ? `<nav class="toc" aria-label="Table of contents"><p>Contents</p><ul>${sections.map(({ id, text }) => `<li><a href="#${id}">${escapeHtml(text)}</a></li>`).join('')}</ul></nav>`
    : '';
  const html = replaceSection(
    replaceSection(shell, 'page-content', content),
    'page-toc',
    toc,
  );
  return html.replace(
    /<title>[\s\S]*?<\/title>/,
    () => `<title>${escapeHtml(heading.text)}</title>`,
  );
}

export default defineConfig({
  // Every page is at the same depth, with relative assets and navigation.
  base: './',
  plugins: [
    {
      name: 'markdown-pages',
      enforce: 'post',
      transformIndexHtml: {
        order: 'pre',
        handler(html, context) {
          const name =
            context.path === '/'
              ? 'index.md'
              : context.path.slice(1).replace(/\.html$/, '.md');
          return renderPage(html, pagePattern.test(name) ? name : 'index.md');
        },
      },
      configureServer(server) {
        server.watcher.add([contentDirectory, dataDirectory]);
        server.watcher.on('all', (event, file) => {
          if (
            ['add', 'change', 'unlink'].includes(event) &&
            ((file.startsWith(contentDirectory) && file.endsWith('.md')) ||
              (file.startsWith(dataDirectory) && file.endsWith('.json')))
          ) {
            server.ws.send({ type: 'full-reload' });
          }
        });
        server.middlewares.use(async (request, response, next) => {
          try {
            const path = request.url?.split('?')[0] ?? '';
            const name = path.slice(1).replace(/\.html$/, '.md');
            if (
              path === '/index.html' ||
              !path.endsWith('.html') ||
              !(await pageNames()).includes(name)
            ) {
              next();
              return;
            }
            const shell = await readFile(shellFile, 'utf8');
            const html = await server.transformIndexHtml(path, shell);
            response.statusCode = 200;
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            response.end(html);
          } catch (error) {
            next(error);
          }
        });
      },
      async generateBundle(_options, bundle) {
        const index = bundle['index.html'];
        if (
          !index ||
          index.type !== 'asset' ||
          typeof index.source !== 'string'
        ) {
          throw new Error('The built index.html is missing');
        }
        for (const name of await pageNames()) {
          if (name === 'index.md') continue;
          this.emitFile({
            type: 'asset',
            fileName: name.replace(/\.md$/, '.html'),
            source: await renderPage(index.source, name),
          });
        }
      },
    },
  ],
});
