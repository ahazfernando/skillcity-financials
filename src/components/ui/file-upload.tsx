"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, CloudUpload, FileText, Download } from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinary/upload-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  value?: string; // Image URL
  onChange: (value: string) => void;
  enableCloudinary?: boolean;
  folder?: string;
  accept?: string;
  maxSize?: number; // in MB
}

export function FileUpload({
  value,
  onChange,
  enableCloudinary = false,
  folder = "products",
  accept = "image/*",
  maxSize = 10,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (accept === "image/*" && !file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate specific file types if provided
    if (accept !== "image/*" && accept !== "*") {
      const allowedTypes = accept.split(",").map((t) => t.trim());
      const fileType = file.type;
      const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;

      const isAllowed = allowedTypes.some((type) => {
        if (type.endsWith("/*")) {
          const baseType = type.split("/")[0];
          return fileType.startsWith(`${baseType}/`);
        }
        return type === fileType || type === fileExtension;
      });

      if (!isAllowed) {
        toast.error(`File type not accepted. Accepted types: ${accept}`);
        return;
      }
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Cloudinary if enabled
    if (enableCloudinary) {
      try {
        setUploading(true);
        // Use uploadToCloudinary directly to handle both images and documents
        const result = await uploadToCloudinary(file, folder);
        onChange(result.secureUrl || result.url);
        toast.success("File uploaded successfully");
      } catch (error) {
        console.error("Error uploading image:", error);
        toast.error("Failed to upload image. Please try again.");
        setPreview(null);
      } finally {
        setUploading(false);
      }
    } else {
      // For local preview only
      onChange(preview || "");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const isImage = (url: string) => {
    if (url.startsWith("data:image")) return true;
    const extension = url.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(extension || "");
  };

  const isPdf = (url: string) => {
    if (url.startsWith("data:application/pdf")) return true;
    const extension = url.split(".").pop()?.toLowerCase();
    return ["pdf"].includes(extension || "");
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = preview || value || "";
    if (!url) return;

    // Check if it's a Cloudinary URL
    if (url.includes("cloudinary.com") && url.includes("/upload/")) {
      // Insert fl_attachment flag to force download
      const downloadUrl = url.replace("/upload/", "/upload/fl_attachment/");
      window.open(downloadUrl, "_blank");
    } else {
      // Fallback for non-Cloudinary URLs or if replacement fails
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-2">
      <Input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative w-full rounded-lg border-2 border-dashed transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          uploading && "opacity-50 cursor-not-allowed"
        )}
        onClick={!uploading ? handleClick : undefined}
      >
        {preview || value ? (
          <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted/30 border flex items-center justify-center group">
            {(isImage(preview || value || "") || (preview && preview.startsWith("data:image"))) ? (
              <img
                src={preview || value || ""}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  <FileText className="h-8 w-8" />
                </div>
                <p className="text-xs text-muted-foreground w-full truncate max-w-[200px] px-2">
                  {value ? value.split("/").pop() : "Document selected"}
                </p>
                {/* Fallback for extension display if filename extraction fails or helps context */}
                {!isImage(value || "") && value && (
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">
                    {value.split(".").pop()}
                  </span>
                )}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Change
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  disabled={uploading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
                {(preview || value) && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleDownload}
                    disabled={uploading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-white">
                  <Upload className="h-6 w-6 animate-spin" />
                  <p className="text-sm">Uploading...</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-48 p-6">
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-12 w-12 animate-spin" />
                <p className="text-sm font-medium">Uploading...</p>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "rounded-full p-4 mb-4 transition-colors",
                    isDragging
                      ? "bg-primary/10"
                      : "bg-muted"
                  )}
                >
                  {isDragging ? (
                    <CloudUpload className="h-8 w-8 text-primary" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">
                    {isDragging
                      ? "Drop file here"
                      : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: {accept === "image/*" ? "Images (PNG, JPG, GIF)" : "Images & Documents"}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons (shown when image is uploaded) */}
      {(preview || value) && !isDragging && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClick}
            disabled={uploading}
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Change Image"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleDownload}
            disabled={uploading}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

