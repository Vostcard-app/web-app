import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";

const StoreProfilePageView: React.FC = () => {
  const { user } = useAuth();

  const [storeName, setStoreName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [description, setDescription] = useState("");
  const [storePhoto, setStorePhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !storeName ||
      !streetAddress ||
      !city ||
      !stateProvince ||
      !country ||
      !contactEmail
    ) {
      setError("Please fill out all required fields.");
      return;
    }

    try {
      setError("");
      setSuccess(false);

      let photoURL = user?.photoURL || "";
      if (storePhoto) {
        const photoRef = ref(storage, `advertisers/${user.uid}/profile.jpg`);
        await uploadBytes(photoRef, storePhoto);
        photoURL = await getDownloadURL(photoRef);
      }

      const advertiserData = {
        storeName,
        streetAddress,
        city,
        stateProvince,
        postalCode,
        country,
        contactEmail,
        contactPerson,
        description,
        photoURL,
        userID: user.uid
      };

      await setDoc(doc(db, "advertisers", user.uid), advertiserData, { merge: true });

      setSuccess(true);
    } catch (err) {
      console.error("Error saving advertiser profile:", err);
      setError("Failed to save profile. Please try again.");
    }
  };

  return (
    <div>
      {/* Form UI here */}
    </div>
  );
};

export default StoreProfilePageView;
