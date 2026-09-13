import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "The studio desk is locked." }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        addRandomSuffix: true,
        allowedContentTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "image/avif",
          "video/mp4",
          "video/webm",
          "video/quicktime",
          "audio/mpeg",
          "audio/mp3",
          "audio/wav",
          "audio/ogg",
          "audio/webm",
          "audio/aac",
          "audio/mp4",
        ],
      }),
      onUploadCompleted: async () => {
        // Localhost does not fire this callback. URLs are used from the client response.
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }
}
