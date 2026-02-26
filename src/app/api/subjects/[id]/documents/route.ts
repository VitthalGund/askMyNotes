import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Subject from "@/models/Subject";
import DocModel from "@/models/Document";
import { parsePDF, parseTXT } from "@/lib/parser";
import { generateEmbeddings } from "@/lib/gemini";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const userId = (session.user as { id: string }).id;
        const { id } = await params;

        // Verify subject belongs to user
        const subject = await Subject.findOne({ _id: id, userId });
        if (!subject) {
            return NextResponse.json({ error: "Subject not found" }, { status: 404 });
        }

        const documents = await DocModel.find({ subjectId: id }).select(
            "fileName fileUrl createdAt chunks"
        );

        const docs = documents.map((d) => ({
            _id: d._id,
            fileName: d.fileName,
            fileUrl: d.fileUrl || null,
            chunkCount: d.chunks.length,
            createdAt: d.createdAt,
        }));

        return NextResponse.json({ documents: docs });
    } catch (error: unknown) {
        console.error("Get documents error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const userId = (session.user as { id: string }).id;
        const { id } = await params;

        // Verify subject belongs to user
        const subject = await Subject.findOne({ _id: id, userId });
        if (!subject) {
            return NextResponse.json({ error: "Subject not found" }, { status: 404 });
        }

        const formData = await req.formData();
        const files = formData.getAll("files") as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
        }

        const results = [];

        for (const file of files) {
            const fileName = file.name;
            const ext = fileName.split(".").pop()?.toLowerCase();

            if (!ext || !["pdf", "txt"].includes(ext)) {
                results.push({ fileName, error: "Unsupported file type. Use PDF or TXT." });
                continue;
            }

            const buffer = Buffer.from(await file.arrayBuffer());
            let chunks;

            try {
                if (ext === "pdf") {
                    chunks = await parsePDF(buffer);
                } else {
                    const text = buffer.toString("utf-8");
                    chunks = parseTXT(text);
                }
            } catch (parseError) {
                console.error(`Error parsing ${fileName}:`, parseError);
                results.push({ fileName, error: "Failed to parse file" });
                continue;
            }

            // Generate embeddings for each chunk using Gemini embedding model
            try {
                const chunkTexts = chunks.map((c) => c.content);
                const embeddings = await generateEmbeddings(chunkTexts);
                for (let i = 0; i < chunks.length; i++) {
                    chunks[i] = { ...chunks[i], embedding: embeddings[i] || [] };
                }
            } catch (embError) {
                console.warn(`Embedding generation failed for ${fileName}, storing without embeddings:`, embError);
                // Continue without embeddings — keyword fallback will be used
            }

            // Upload file to Cloudinary
            let fileUrl = "";
            try {
                const cloudinaryResult = await uploadToCloudinary(buffer, fileName);
                fileUrl = cloudinaryResult.secure_url;
            } catch (cloudError) {
                console.error(`Failed to upload ${fileName} to Cloudinary:`, cloudError);
                // We'll continue saving local text even if Cloudinary fails, 
                // but the UI won't have a highlightable PDF link.
            }

            const doc = await DocModel.create({
                fileName,
                fileUrl,
                subjectId: id,
                userId,
                chunks,
            });

            results.push({
                fileName,
                _id: doc._id,
                chunkCount: chunks.length,
                success: true,
            });
        }

        return NextResponse.json({ results }, { status: 201 });
    } catch (error: unknown) {
        console.error("Upload documents error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
