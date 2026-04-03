"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, ImagePlus, Trash2, Image as ImageIcon } from "lucide-react";
import { storage } from "@/lib/firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  restaurantId: string;
  currentUrl: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  className?: string; // Permitir personalização de altura/estilo
}

export function ImageUploadField({
  restaurantId,
  currentUrl,
  onChange,
  folder = "products",
  className,
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  // Sync preview with external prop
  useEffect(() => {
    setPreview(currentUrl);
  }, [currentUrl]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional: check file size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. O limite é 5MB.");
      return;
    }

    setUploading(true);
    try {
      // Local preview first for instant feedback 
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);

      // Upload to Firebase Storage
      const fileName = `${crypto.randomUUID()}_${file.name}`;
      const storageRef = ref(storage, `restaurants/${restaurantId}/${folder}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      onChange(downloadUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Erro ao enviar imagem. Verifique sua conexão.");
      setPreview(currentUrl); // Reverte para original em erro
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage() {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("relative group w-full", className)}>
      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 group h-full min-h-[160px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={preview} 
            alt="Prévia" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-xs text-white font-black uppercase tracking-wider backdrop-blur-md transition-all active:scale-95"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Trocar Imagem"}
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="rounded-xl bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 p-2 text-red-400 transition-all active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "w-full h-32 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300",
            "border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:border-orange-500 hover:text-orange-400 hover:bg-orange-500/5",
            uploading && "opacity-50 cursor-not-allowed"
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-orange-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Enviando...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
               <div className="h-12 w-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mb-3 group-hover:bg-orange-500/20 transition-colors">
                  <ImagePlus className="h-5 w-5" />
               </div>
               <span className="text-sm font-bold text-zinc-300">Adicionar Imagem</span>
               <span className="text-[10px] uppercase font-bold text-zinc-600 mt-1">JPG, PNG ou WEBP</span>
            </div>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
