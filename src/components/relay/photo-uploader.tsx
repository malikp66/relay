"use client";

/**
 * Upload foto bukti: buka kamera langsung, kompres di perangkat, upload dengan progres.
 * Diadaptasi dari KokonutUI File Upload (MIT) — https://kokonutui.com
 */
import { AnimatePresence, motion } from "motion/react";
import { Camera, Loader2 } from "lucide-react";
import { CloseButton } from "./icon-button";
import { useRef, useState } from "react";
import { notify } from "./notify";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

async function compress(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", quality));
  } catch {
    return file;
  }
}

function upload(blob: Blob, onProgress: (p: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", blob, "foto.jpg");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      const body = JSON.parse(xhr.responseText || "{}");
      if (xhr.status >= 200 && xhr.status < 300) resolve(body.url);
      else reject(new Error(body.error ?? "Upload gagal"));
    };
    xhr.onerror = () => reject(new Error("Koneksi terputus. Coba lagi."));
    xhr.open("POST", "/api/upload");
    xhr.send(fd);
  });
}

export function PhotoUploader({ photos, onChange, disabled, max = 6 }: { photos: string[]; onChange: (urls: string[]) => Promise<void> | void; disabled?: boolean; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, max - photos.length);
    const urls: string[] = [];
    try {
      for (const [i, f] of list.entries()) {
        setProgress(i / list.length);
        const blob = await compress(f);
        urls.push(await upload(blob, (p) => setProgress((i + p) / list.length)));
      }
      await onChange([...photos, ...urls]);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <AnimatePresence initial={false}>
          {photos.map((url) => (
            <motion.div key={url} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="relative">
              <button type="button" onClick={() => setPreview(url)} className="press block size-20 overflow-hidden rounded-xl bg-muted ring-1 ring-inset ring-black/5 dark:ring-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Foto bukti" className="size-full object-cover" />
              </button>
              {!disabled && (
                <CloseButton variant="overlay" size="sm" label="Hapus foto" onClick={() => onChange(photos.filter((p) => p !== url))} className="absolute right-1 top-1" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {disabled && !photos.length && <p className="text-sm text-muted-foreground">Belum ada foto.</p>}
        {!disabled && photos.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={progress !== null}
            className={cn("press flex size-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-foreground/20 bg-foreground/[0.02] text-[11px] font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/60 hover:bg-primary/5 hover:text-primary", progress !== null && "border-primary/60 text-primary")}
          >
            {progress !== null ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                <span className="tabular">{Math.round(progress * 100)}%</span>
              </>
            ) : (
              <>
                <Camera className="size-5" />
                Ambil foto
              </>
            )}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => handle(e.target.files)} />
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Pratinjau foto</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={preview} alt="Foto bukti" className="max-h-[80vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
