// ✅ Image Storage Service for Large Images
// 📁 src/services/imageStorageService.ts

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/firebaseConfig';

export interface ImageUploadResult {
  url: string;
  path: string;
  size: number;
  isStorageUrl: boolean;
}

export class ImageStorageService {
  
  /**
   * Upload image to Firebase Storage if it's too large for Firestore
   * Returns either Storage URL or original base64 depending on size
   */
  static async processImage(
    imageData: string, 
    userId: string, 
    tourId: string, 
    imageIndex: number
  ): Promise<ImageUploadResult> {
    
    // If it's already a URL, return as-is
    if (!imageData.startsWith('data:image/')) {
      return {
        url: imageData,
        path: '',
        size: 0,
        isStorageUrl: imageData.includes('firebasestorage.googleapis.com')
      };
    }

    const imageSize = imageData.length;
    console.log(`📏 Processing image ${imageIndex}: ${(imageSize / 1024).toFixed(1)} KB`);

    // For images larger than 1MB, upload to Firebase Storage
    if (imageSize > 1048576) { // 1MB
      console.log(`📤 Uploading large image to Firebase Storage...`);
      return await this.uploadToStorage(imageData, userId, tourId, imageIndex);
    }

    // For smaller images, return base64 (existing behavior)
    return {
      url: imageData,
      path: '',
      size: imageSize,
      isStorageUrl: false
    };
  }

  /**
   * Upload base64 image to Firebase Storage
   */
  private static async uploadToStorage(
    base64Data: string, 
    userId: string, 
    tourId: string, 
    imageIndex: number
  ): Promise<ImageUploadResult> {
    try {
      // Extract image data and type
      const [header, data] = base64Data.split(',');
      const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      const extension = mimeType.split('/')[1] || 'jpg';
      
      // Convert base64 to blob
      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      // Create storage path
      const timestamp = Date.now();
      const fileName = `tour_${tourId}_image_${imageIndex}_${timestamp}.${extension}`;
      const storagePath = `guided-tours/${userId}/${tourId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // Upload to Firebase Storage
      console.log(`📤 Uploading to: ${storagePath}`);
      const snapshot = await uploadBytes(storageRef, blob, {
        contentType: mimeType,
        customMetadata: {
          userId,
          tourId,
          imageIndex: imageIndex.toString(),
          uploadedAt: new Date().toISOString()
        }
      });

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log(`✅ Image uploaded successfully: ${(blob.size / 1024).toFixed(1)} KB`);
      console.log(`🔗 Download URL: ${downloadURL}`);

      return {
        url: downloadURL,
        path: storagePath,
        size: blob.size,
        isStorageUrl: true
      };

    } catch (error) {
      console.error('❌ Error uploading image to Storage:', error);
      
      // Fallback: compress and return base64 if upload fails
      console.log('🔄 Falling back to compressed base64...');
      const compressedImage = await this.compressImage(base64Data, 0.7); // 70% quality
      
      return {
        url: compressedImage,
        path: '',
        size: compressedImage.length,
        isStorageUrl: false
      };
    }
  }

  /**
   * Compress base64 image to reduce size
   */
  private static async compressImage(base64Data: string, quality: number = 0.8): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920x1080 for large images)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedData = canvas.toDataURL('image/jpeg', quality);
        
        console.log(`🗜️ Compressed image: ${(base64Data.length / 1024).toFixed(1)} KB → ${(compressedData.length / 1024).toFixed(1)} KB`);
        resolve(compressedData);
      };

      img.src = base64Data;
    });
  }

  /**
   * Delete image from Firebase Storage
   */
  static async deleteStorageImage(storagePath: string): Promise<void> {
    try {
      if (!storagePath) return;
      
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
      console.log(`🗑️ Deleted storage image: ${storagePath}`);
    } catch (error) {
      console.error('❌ Error deleting storage image:', error);
    }
  }

  /**
   * Process multiple images for a tour
   */
  static async processMultipleImages(
    images: string[], 
    userId: string, 
    tourId: string
  ): Promise<{ urls: string[], storagePaths: string[] }> {
    const urls: string[] = [];
    const storagePaths: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const result = await this.processImage(images[i], userId, tourId, i);
      urls.push(result.url);
      if (result.path) {
        storagePaths.push(result.path);
      }
    }

    return { urls, storagePaths };
  }

  /**
   * Clean up old storage images when tour is updated
   */
  static async cleanupOldImages(oldStoragePaths: string[]): Promise<void> {
    if (!oldStoragePaths || oldStoragePaths.length === 0) return;

    console.log(`🧹 Cleaning up ${oldStoragePaths.length} old storage images...`);
    
    const deletePromises = oldStoragePaths.map(path => this.deleteStorageImage(path));
    await Promise.allSettled(deletePromises);
  }
}
