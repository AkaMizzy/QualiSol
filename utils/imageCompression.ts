import * as ImageManipulator from "expo-image-manipulator";

/**
 * Compresses and resizes an image to optimize upload size.
 * Resizes to a maximum width of 1920px (maintains aspect ratio) and uses 70% JPEG quality.
 *
 * @param uri The original image URI
 * @returns The manipulated image result (uri, width, height) or a fallback with original URI if it fails.
 */
export const compressImage = async (uri: string) => {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1920 } }], // Resize width to max 1920px
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );
    return manipResult;
  } catch (error) {
    console.error("Image compression failed:", error);
    // Fallback to original URI if manipulation fails for any reason
    return { uri, width: 0, height: 0, base64: undefined };
  }
};
