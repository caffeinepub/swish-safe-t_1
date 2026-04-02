import { Image, X } from "lucide-react";
import { useRef, useState } from "react";
import { putFile } from "../lib/blob-storage";

interface PhotoUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxPhotos?: number;
  label?: string;
}

export function PhotoUpload({
  images,
  onChange,
  maxPhotos = 5,
  label = "Photos",
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(
        files.slice(0, maxPhotos - images.length).map((f) => putFile(f)),
      );
      onChange([...images, ...urls]);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div
            key={`upload-${i}-${img.slice(-8)}`}
            className="relative w-20 h-20 rounded border border-border overflow-hidden group"
          >
            <img
              src={img}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {images.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-20 h-20 rounded border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            data-ocid="photo.upload_button"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Image className="w-5 h-5" />
                <span className="text-xs mt-1">Add</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
        data-ocid="photo.dropzone"
      />
    </div>
  );
}
