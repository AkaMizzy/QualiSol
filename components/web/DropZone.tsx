import { COLORS } from "@/constants/theme";
import React, { useState } from "react";
import { StyleSheet } from "react-native";

interface DropZoneProps {
  onDrop: (photoId: string) => void | Promise<void>;
  children: React.ReactNode;
  label?: string;
  highlightColor?: string;
  disabled?: boolean;
}

export default function DropZone({
  onDrop,
  children,
  highlightColor = COLORS.primary,
  disabled = false,
}: DropZoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const photoId = e.dataTransfer.getData("photoId");
    if (photoId) {
      await onDrop(photoId);
    }
  };

  const dropZoneStyle = {
    position: "relative" as const,
    flex: 1,
    transition: "all 0.2s ease",
    ...(isDraggingOver && {
      backgroundColor: `${highlightColor}15`,
      border: `3px dashed ${highlightColor}`,
      borderRadius: 8,
    }),
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={dropZoneStyle}
    >
      {children}
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
});
