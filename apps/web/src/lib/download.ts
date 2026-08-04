// Shared browser-download trigger for both server-fetched blobs (Excel/CSV via apiClient.getBlob)
// and client-generated blobs (PDF via jsPDF's .output('blob')) -- one implementation instead of
// duplicating the create-anchor-click-revoke dance per export format.
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
