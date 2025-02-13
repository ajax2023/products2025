import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';

export const uploadImageToStorage = async (base64Image: string, productId: string): Promise<string> => {
  try {
    // Change from products/${productId}/image to products/${productId}
    const storageRef = ref(storage, `products/${productId}`);
    await uploadString(storageRef, base64Image, 'data_url');
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};
