import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { createSupabaseService } from "@/lib/supabase-service";

/**
 * GET /api/v1/bookmarks/:id — Get a single bookmark
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const supabase = createSupabaseService();

  const { data, error } = await supabase
    .from("bookmarks")
    .select("*, bookmark_tags(tags(id, name))")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
  }

  return NextResponse.json({
    bookmark: {
      id: data.id,
      url: data.url,
      title: data.title,
      description: data.description,
      note: data.note,
      domain: data.domain,
      category: data.category,
      domain_context: data.domain_context,
      screenshot_url: data.screenshot_url,
      favicon_url: data.favicon_url,
      tags: data.bookmark_tags?.map((bt: { tags: { name: string } }) => bt.tags?.name).filter(Boolean) ?? [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
  });
}

/**
 * PATCH /api/v1/bookmarks/:id — Update a bookmark
 * Body: { title?, note?, tags? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  let body: { title?: string; note?: string; tags?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = createSupabaseService();

  // Build update object
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.note !== undefined) updates.note = body.note;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("bookmarks")
      .update(updates)
      .eq("id", id)
      .eq("user_id", auth.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Update tags if provided
  if (body.tags) {
    // Remove existing user tags
    const { data: existingBt } = await supabase
      .from("bookmark_tags")
      .select("tag_id")
      .eq("bookmark_id", id)
      .eq("source", "user");

    if (existingBt?.length) {
      await supabase
        .from("bookmark_tags")
        .delete()
        .eq("bookmark_id", id)
        .eq("source", "user");
    }

    // Add new tags
    for (const tagName of body.tags) {
      const normalized = tagName.toLowerCase().trim();
      const { data: tag } = await supabase
        .from("tags")
        .upsert(
          { user_id: auth.userId, name: normalized },
          { onConflict: "user_id,name" }
        )
        .select()
        .single();

      if (tag) {
        await supabase
          .from("bookmark_tags")
          .upsert(
            {
              bookmark_id: id,
              tag_id: tag.id,
              source: "user",
              confidence: 1.0,
            },
            { onConflict: "bookmark_id,tag_id" }
          );
      }
    }
  }

  // Fetch updated bookmark
  const { data, error: fetchError } = await supabase
    .from("bookmarks")
    .select("*, bookmark_tags(tags(id, name))")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .single();

  if (fetchError || !data) {
    return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
  }

  return NextResponse.json({
    bookmark: {
      id: data.id,
      url: data.url,
      title: data.title,
      note: data.note,
      domain: data.domain,
      category: data.category,
      tags: data.bookmark_tags?.map((bt: { tags: { name: string } }) => bt.tags?.name).filter(Boolean) ?? [],
      updated_at: data.updated_at,
    },
  });
}

/**
 * DELETE /api/v1/bookmarks/:id — Delete a bookmark
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const supabase = createSupabaseService();

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
