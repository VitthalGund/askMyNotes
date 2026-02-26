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
