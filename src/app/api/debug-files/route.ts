import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const root = process.cwd();
  const files: any = {
    root,
    rootFiles: [],
    docsFiles: [],
    docsExists: false,
  };

  try {
    files.rootFiles = await fs.promises.readdir(root);
  } catch (e: any) {
    files.rootError = e.message;
  }

  try {
    const docsPath = path.join(root, 'docs');
    files.docsPath = docsPath;
    files.docsExists = fs.existsSync(docsPath);
    if (files.docsExists) {
        files.docsFiles = await fs.promises.readdir(docsPath);
    }
  } catch (e: any) {
    files.docsError = e.message;
  }

  return NextResponse.json(files);
}

