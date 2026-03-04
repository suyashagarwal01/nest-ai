import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { createSupabaseService } from "@/lib/supabase-service";
import { generateTagsServer } from "@/lib/tagger/tagger";

/**
 * GET /api/v1/bookmarks — List user's bookmarks with optional search
 * Query params: ?search=term&category=Dev&limit=50&offset=0
 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
  const offset = Number(searchParams.get("offset")) || 0;

  const supabase = createSupabaseService();
  let query = supabase
    .from("bookmarks")
    .select("*, bookmark_tags(tags(id, name))", { count: "exact" })
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq("category", category);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,url.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bookmarks = (data ?? []).map((b) => ({
    id: b.id,
    url: b.url,
    title: b.title,
    description: b.description,
    note: b.note,
    domain: b.domain,
    category: b.category,
    domain_context: b.domain_context,
    screenshot_url: b.screenshot_url,
    favicon_url: b.favicon_url,
    tags: b.bookmark_tags?.map((bt: { tags: { name: string } }) => bt.tags?.name).filter(Boolean) ?? [],
    created_at: b.created_at,
  }));

  return NextResponse.json({ bookmarks, total: count ?? 0, limit, offset });
}

/**
 * POST /api/v1/bookmarks — Create a new bookmark with auto-tagging
 * Body: { url: string, title?: string, note?: string, tags?: string[] }
 */
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (auth instanceof Response) return auth;

  let body: { url?: string; title?: string; note?: string; tags?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Validate URL
  try {
    new URL(body.url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const supabase = createSupabaseService();

  // Auto-tag with server-side Tier 1 tagger
  const tagResult = generateTagsServer(body.url, body.title ?? body.url);

  // Insert bookmark
  const { data: bookmark, error: bookmarkError } = await supabase
    .from("bookmarks")
    .upsert(
      {
        user_id: auth.userId,
        url: body.url,
        title: body.title ?? null,
        note: body.note ?? null,
        category: tagResult.category,
        domain_context: tagResult.domainContext || null,
        has_screenshot: false,
      },
      { onConflict: "user_id,url" }
    )
    .select()
    .single();

  if (bookmarkError || !bookmark) {
    return NextResponse.json(
      { error: bookmarkError?.message ?? "Failed to save bookmark" },
      { status: 500 }
    );
  }

  // Combine auto-tags + user-provided tags
  const allTags = [
    ...tagResult.topics.map((t) => ({ name: t, source: "ai_tier1" as const, confidence: tagResult.confidence })),
    ...(body.tags ?? []).map((t) => ({ name: t.toLowerCase().trim(), source: "user" as const, confidence: 1.0 })),
  ];

  const savedTags: string[] = [];
  for (const tagInfo of allTags) {
    const { data: tag } = await supabase
      .from("tags")
      .upsert(
        { user_id: auth.userId, name: tagInfo.name },
        { onConflict: "user_id,name" }
      )
      .select()
      .single();

    if (tag) {
      await supabase
        .from("bookmark_tags")
        .upsert(
          {
            bookmark_id: bookmark.id,
            tag_id: tag.id,
            source: tagInfo.source,
            confidence: tagInfo.confidence,
          },
          { onConflict: "bookmark_id,tag_id" }
        );
      savedTags.push(tagInfo.name);
    }
  }

  return NextResponse.json(
    {
      bookmark: {
        id: bookmark.id,
        url: bookmark.url,
        title: bookmark.title,
        domain: bookmark.domain,
        category: bookmark.category,
        domain_context: bookmark.domain_context,
        tags: savedTags,
        created_at: bookmark.created_at,
      },
    },
    { status: 201 }
  );
}
