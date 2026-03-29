import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, ".env.prod") });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STORAGE_BUCKET = process.env.STORAGE_BUCKET!;

async function main() {
  console.log("Connecting to Supabase:", SUPABASE_URL);
  console.log("Bucket:", STORAGE_BUCKET);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. List all files in the bucket
  console.log("\n--- Listing files in bucket ---");
  const { data: files, error: listError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });

  if (listError) {
    console.error("Error listing files:", listError);
    return;
  }

  console.log("Files found:", files?.length);
  for (const f of files ?? []) {
    console.log(`  ${f.name}  (${f.metadata?.mimetype ?? "folder?"}, ${f.created_at})`);
  }

  // Look for .pptx files — they might be in subfolders
  let pptxPath: string | null = null;

  // Check top-level for pptx
  const topLevelPptx = files?.find((f) => f.name.endsWith(".pptx"));
  if (topLevelPptx) {
    pptxPath = topLevelPptx.name;
  } else {
    // Search inside each folder
    for (const f of files ?? []) {
      if (!f.name.includes(".")) {
        // likely a folder
        console.log(`\n  Scanning folder: ${f.name}/`);
        const { data: subFiles } = await supabase.storage
          .from(STORAGE_BUCKET)
          .list(f.name, { limit: 100 });
        for (const sf of subFiles ?? []) {
          console.log(`    ${f.name}/${sf.name}`);
          if (sf.name.endsWith(".pptx")) {
            pptxPath = `${f.name}/${sf.name}`;
          }
        }
      }
    }
  }

  if (!pptxPath) {
    console.error("\nNo .pptx file found in bucket!");
    return;
  }

  console.log(`\n--- Downloading template: ${pptxPath} ---`);

  // 2. Download the PPTX
  const { data: blob, error: dlError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(pptxPath);

  if (dlError || !blob) {
    console.error("Download error:", dlError);
    return;
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  console.log(`Downloaded ${buffer.length} bytes`);

  // 3. Load with JSZip
  const zip = await JSZip.loadAsync(buffer);

  // Show all entries
  console.log("\n--- ZIP entries (ppt/ related) ---");
  zip.forEach((path) => {
    if (path.startsWith("ppt/")) {
      console.log(`  ${path}`);
    }
  });

  // 4. Read slide1.xml
  const slide1Entry = zip.file("ppt/slides/slide1.xml");
  if (!slide1Entry) {
    console.error("No ppt/slides/slide1.xml found!");
    return;
  }

  const slide1Xml = await slide1Entry.async("string");
  console.log(`\n--- slide1.xml (first 3000 chars) ---`);
  console.log(slide1Xml.substring(0, 3000));

  // 5. Find all <p:ph> elements
  const phMatches = slide1Xml.match(/<p:ph[^/]*\/>/g) || [];
  console.log(`\n--- <p:ph> elements found: ${phMatches.length} ---`);
  for (const m of phMatches) {
    console.log(`  ${m}`);
  }

  // Also check for non-self-closing <p:ph> tags
  const phMatchesOpen = slide1Xml.match(/<p:ph[^>]*>/g) || [];
  const unique = phMatchesOpen.filter((m) => !phMatches.includes(m));
  if (unique.length > 0) {
    console.log(`  (additional non-self-closing <p:ph> tags):`);
    for (const m of unique) {
      console.log(`  ${m}`);
    }
  }

  // 6. First <p:txBody> block
  const txBodyMatch = slide1Xml.match(/<p:txBody>[\s\S]*?<\/p:txBody>/);
  if (txBodyMatch) {
    const txBody = txBodyMatch[0];
    console.log(`\n--- First <p:txBody> (first 2000 chars) ---`);
    console.log(txBody.substring(0, 2000));
  } else {
    console.log("\nNo <p:txBody> found in slide1.xml");
  }
}

main().catch(console.error);
