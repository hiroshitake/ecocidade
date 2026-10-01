import React from "react";

interface ImageCropperProps {
  visible: boolean;
  imageUri: string | null;
  onCancel: () => void;
  onConfirm: (croppedUri: string) => void;
}

export default function ImageCropper(_: ImageCropperProps) {
  return null;
}
