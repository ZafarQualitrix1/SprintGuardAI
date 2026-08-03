// Shared by any feature that uploads a small image inline as a base64 data: URL (organization
// logo, user avatar) instead of through external object storage -- see
// apps/api/.../upload-organization-logo.command.ts and upload-user-avatar.command.ts.
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result is a "data:<mime>;base64,<data>" URL -- the backend stores it as-is with
      // its own contentType field, so only the part after the comma is sent.
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export interface ImageFileValidationError {
  title: string;
  description: string;
}

// Client-side pre-check so an oversized/unsupported file is rejected instantly with a clear
// message instead of round-tripping to the backend's own validation.
export function validateImageFile(
  file: File,
  options: { maxBytes: number; allowedTypes: readonly string[]; label: string },
): ImageFileValidationError | null {
  if (!options.allowedTypes.includes(file.type)) {
    return {
      title: `Unsupported file type`,
      description: `${file.name} isn't a supported image type.`,
    };
  }
  if (file.size > options.maxBytes) {
    return {
      title: `${options.label} is too large`,
      description: `${file.name} is ${(file.size / (1024 * 1024)).toFixed(1)}MB. ${options.label} must be ${
        options.maxBytes / (1024 * 1024)
      }MB or smaller.`,
    };
  }
  return null;
}
