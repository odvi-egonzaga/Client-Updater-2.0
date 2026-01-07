import fs from "fs";
import path from "path";
import matter from "gray-matter";

const ROOT_DIR = (() => {
  let currentDir = process.cwd();
  // In Vercel, process.cwd() is usually /var/task
  // But we can try to find package.json to be sure
  try {
    // Check if we are already at root
    if (fs.existsSync(path.join(currentDir, "package.json"))) {
      return currentDir;
    }

    // Look up a few levels
    for (let i = 0; i < 3; i++) {
      const parent = path.dirname(currentDir);
      if (parent === currentDir) break;
      if (fs.existsSync(path.join(parent, "package.json"))) {
        return parent;
      }
      currentDir = parent;
    }
  } catch (e) {
    console.error("Error finding root dir:", e);
  }
  return process.cwd();
})();

const DOCS_DIR = path.join(ROOT_DIR, "docs");

export interface DocNode {
  id: string;
  title: string;
  type: "file" | "directory";
  children?: DocNode[];
  path?: string; // real file path relative to root
}

export interface DocContent {
  title: string;
  content: string;
  frontmatter: Record<string, any>;
}

const ALLOWED_ROOT_FILES = ["README.md", "DESIGN.md"];
const ALLOWED_CLI_FILES = ["cli/template/README.md"];

// Helper to format title from filename
function formatTitle(filename: string): string {
  return filename
    .replace(/\.mdx?$/, "")
    .replace(/^\d+-/, "") // Remove leading numbers like 01-
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function getDocsStructure(): Promise<DocNode[]> {
  console.log("[Debug] ROOT_DIR:", ROOT_DIR);
  try {
    if (fs.existsSync(ROOT_DIR)) {
      const entries = await fs.promises.readdir(ROOT_DIR);
      console.log("[Debug] Root entries:", entries);
    }
  } catch (error) {
    console.error("[Debug] Error listing root:", error);
  }

  const nodes: DocNode[] = [];

  // 1. Root files
  for (const filename of ALLOWED_ROOT_FILES) {
    if (fs.existsSync(path.join(ROOT_DIR, filename))) {
      nodes.push({
        id: filename,
        title:
          filename === "README.md" ? "Introduction" : formatTitle(filename),
        type: "file",
        path: filename,
      });
    }
  }

  // 2. CLI Docs
  for (const filepath of ALLOWED_CLI_FILES) {
    if (fs.existsSync(path.join(ROOT_DIR, filepath))) {
      nodes.push({
        id: filepath,
        title: "CLI Template",
        type: "file",
        path: filepath,
      });
    }
  }

  // 3. Docs folder
  const docsNodes = await scanDirectory(DOCS_DIR, "docs");
  nodes.push(...docsNodes);

  return nodes;
}

async function scanDirectory(
  dir: string,
  parentId: string,
): Promise<DocNode[]> {
  if (!fs.existsSync(dir)) return [];

  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const nodes: DocNode[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(ROOT_DIR, fullPath);
    const id = relativePath.replace(/\\/g, "/"); // Normalize for URLs

    if (entry.isDirectory()) {
      const children = await scanDirectory(fullPath, id);
      if (children.length > 0) {
        nodes.push({
          id,
          title: formatTitle(entry.name),
          type: "directory",
          children,
        });
      }
    } else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
      // Read frontmatter for title if possible, else derive from filename
      const fileContent = await fs.promises.readFile(fullPath, "utf-8");
      const { data } = matter(fileContent);

      nodes.push({
        id,
        title: data.title || formatTitle(entry.name),
        type: "file",
        path: relativePath,
      });
    }
  }

  // Sort: Directories first, then files alphabetically (or by prefix if present)
  return nodes.sort((a, b) => {
    if (a.type === b.type) return a.id.localeCompare(b.id);
    return a.type === "directory" ? 1 : -1; // Keep directories at bottom usually? Or top?
    // Usually folders like "framework" contain the files.
    // Let's just sort by ID for now, which handles 01-overview vs 02-techstack
  });
}

export async function getDocContent(id: string): Promise<DocContent | null> {
  // Security check: ensure id resolves to a file within allowed paths
  const cleanId = id.replace(/\.\./g, ""); // Prevent directory traversal
  const fullPath = path.join(ROOT_DIR, cleanId);

  // Validate that the resolved path is within ROOT_DIR and is one of the allowed types/locations
  if (!fullPath.startsWith(ROOT_DIR)) return null;

  // Basic check: file must exist and be md/mdx
  if (!fs.existsSync(fullPath)) return null;
  if (!fullPath.endsWith(".md") && !fullPath.endsWith(".mdx")) return null;

  try {
    const fileContent = await fs.promises.readFile(fullPath, "utf-8");
    const { data, content } = matter(fileContent);

    let title = data.title;
    if (!title) {
      title = formatTitle(path.basename(fullPath));
    }

    return {
      title,
      content,
      frontmatter: data,
    };
  } catch (error) {
    console.error(`Error reading doc ${id} at ${fullPath}:`, error);
    return null;
  }
}
