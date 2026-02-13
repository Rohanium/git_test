import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/server/db";
import { importCabinetVisionFile } from "@/server/services/cabinet-vision";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    const jobId = formData.get("jobId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const csvContent = await file.text();
    const result = await importCabinetVisionFile(db, {
      csvContent,
      fileName: file.name,
      projectId: projectId || undefined,
      jobId: jobId || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cabinet Vision import error:", error);
    return NextResponse.json(
      { error: "Import failed", details: String(error) },
      { status: 500 }
    );
  }
}
