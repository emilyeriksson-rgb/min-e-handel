import { useId, useRef, useState } from "react";
import { uploadProductImage } from "../../api/api.js";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export default function ProductImageUploader({
  productType,
  productId,
  imageUrl,
  disabled = false,
  onUploaded,
  onBusyChange,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const busyRef = useRef(false);

  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");

  const previewUrl = uploadedImage?.image_url || imageUrl;
  const busy = disabled || isUploading;

  function handleFileChange(event) {
    setFile(event.target.files?.[0] || null);
    setError("");
    setMessage("");
    setWarning("");
  }

  async function handleUpload() {
    if (busyRef.current || disabled) return;

    setError("");
    setMessage("");
    setWarning("");

    if (!file) {
      setError("Please select a JPEG or PNG image.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("The image must be 2 MB or smaller.");
      return;
    }

    busyRef.current = true;
    setIsUploading(true);
    onBusyChange?.(true);

    try {
      const result = await uploadProductImage({
        productType,
        productId,
        file,
      });

      setUploadedImage(result);
      setMessage("Product image updated.");
      setWarning(result.warning || "");
      setFile(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      onUploaded?.(result);
    } catch (error) {
      setError(
        error.name === "TimeoutError"
          ? "The request timed out. Refresh the product before retrying."
          : error.message ||
              "The image could not be uploaded."
      );
    } finally {
      busyRef.current = false;
      setIsUploading(false);
      onBusyChange?.(false);
    }
  }

  return (
    <fieldset disabled={busy}>
      <legend>Product image</legend>

      {previewUrl && (
        <img
          src={previewUrl}
          alt="Current product image"
          style={{
            display: "block",
            maxWidth: "180px",
            maxHeight: "220px",
            objectFit: "contain",
            marginBottom: "1rem",
          }}
        />
      )}

      <label htmlFor={inputId}>Choose image</label>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileChange}
      />

      <p>JPEG or PNG. Maximum file size: 2 MB.</p>

      <button
        type="button"
        className="manage-order-button"
        disabled={busy || !file}
        onClick={handleUpload}
      >
        {isUploading ? "Uploading…" : "Upload image"}
      </button>

      {message && <p role="status">{message}</p>}
      {warning && <p role="alert">{warning}</p>}
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}