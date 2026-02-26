import { v2 as cloudinary } from "cloudinary";

if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
) {
    console.warn("Cloudinary configuration missing in environment variables.");
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(
    buffer: Buffer,
    fileName: string,
    folder: string = "askmynotes"
): Promise<{ secure_url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "raw", // Needed for PDFs and TXTs
                public_id: fileName.split(".")[0] + "_" + Date.now(),
                // Keep original extension if needed: use_filename: true, unique_filename: true
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload failed:", error);
                    reject(error);
                } else if (result) {
                    resolve({ secure_url: result.secure_url, public_id: result.public_id });
                } else {
                    reject(new Error("Unknown Cloudinary upload error."));
                }
            }
        );

        // Write the buffer to the stream
        uploadStream.end(buffer);
    });
}


export async function deleteFromCloudinary(fileUrl: string): Promise<void> {
    try {
        const parts = fileUrl.split("/");
        const uploadIndex = parts.findIndex((p) => p === "upload");
        if (uploadIndex === -1) return;

        // Extracts the public_id (everything after the /v12345/ version tag)
        const publicIdWithExt = parts.slice(uploadIndex + 2).join("/");

        // For raw files, the extension is often considered part of the public_id depending on how it was uploaded
        // We'll try destroying it exactly as it appears in the URL
        await cloudinary.uploader.destroy(publicIdWithExt, { resource_type: "raw" });
        console.log(`Deleted raw file from Cloudinary: ${publicIdWithExt}`);
    } catch (error) {
        console.error("Failed to delete from Cloudinary:", error);
    }
}
