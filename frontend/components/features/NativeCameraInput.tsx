import { CameraCapture } from "./CameraCapture";

// Simple wrapper to expose the same interface or reuse CameraCapture
// The user asked to reuse NativeCameraInput (which is basically our refactored CameraCapture)
// We already have 'CameraCapture.tsx' which IS the native input one now.
// So we just re-export or use it directly. This file is just for clarity if needed, 
// but likely we can just use CameraCapture in ManualItemDialog.
// I will just use CameraCapture there.
// But to match the import I put in ManualItemDialog, I'll export it here.

export { CameraCapture as NativeCameraInput } from "./CameraCapture";
