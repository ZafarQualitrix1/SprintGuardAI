import JSZip from 'jszip';
import type { AutomationFile } from '@sprintguard/shared';

// Client-side zip -- the API returns `files` as plain {path, content} JSON (already used for
// "Preview Code"), so downloading is just zipping the same payload in the browser. No server-side
// zip streaming needed on a serverless function.
export async function downloadFilesAsZip(zipFileName: string, groups: { folder: string; files: AutomationFile[] }[]) {
  const zip = new JSZip();
  for (const group of groups) {
    for (const file of group.files) {
      zip.file(`${group.folder}/${file.path}`, file.content);
    }
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}
