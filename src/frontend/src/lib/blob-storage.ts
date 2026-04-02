// Blob storage - for demo uses base64 data URLs
// In production this would use Caffeine blob storage

export async function putFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function getFileUrl(hash: string): string {
  // For demo: hash is already a data URL or a URL
  return hash;
}
