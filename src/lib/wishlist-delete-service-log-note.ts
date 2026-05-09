import type { Prisma } from "@prisma/client";
import { ADD_SERVICE_EVENT_COMMENT_MAX_LENGTH } from "@mototwin/domain";

function buildPartsCartRemovalNote(wishlistTitle: string): string {
  const t = wishlistTitle.trim() || "без названия";
  return `Позиция «${t}» удалена из корзины замен и расходников.`;
}

function appendBoundedServiceEventComment(
  existing: string | null,
  appended: string,
  maxLen: number
): string {
  const base = (existing ?? "").trim();
  const sep = base.length ? "\n\n" : "";
  const full = `${base}${sep}${appended}`;
  if (full.length <= maxLen) {
    return full;
  }
  const overhead = base.length + sep.length;
  if (overhead >= maxLen) {
    return `${base.slice(0, Math.max(0, maxLen - 1))}…`;
  }
  const room = maxLen - overhead;
  const note =
    appended.length <= room ? appended : `${appended.slice(0, Math.max(1, room - 1))}…`;
  return `${base}${sep}${note}`;
}

/**
 * При удалении позиции корзины (wishlist), связанной с установкой, дописывает пояснение в комментарий
 * соответствующих сервисных событий в журнале.
 */
export async function appendPartsCartRemovalNoteForWishlistItem(
  tx: Prisma.TransactionClient,
  args: { vehicleId: string; itemId: string; title: string }
): Promise<void> {
  const note = buildPartsCartRemovalNote(args.title);
  const maxLen = ADD_SERVICE_EVENT_COMMENT_MAX_LENGTH;

  const fromExpenses = await tx.expenseItem.findMany({
    where: {
      vehicleId: args.vehicleId,
      shoppingListItemId: args.itemId,
      serviceEventId: { not: null },
    },
    select: { serviceEventId: true },
  });

  const serviceEventIds = new Set<string>();
  for (const row of fromExpenses) {
    if (row.serviceEventId) {
      serviceEventIds.add(row.serviceEventId);
    }
  }

  const fromJson = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT se."id" AS id
    FROM "service_events" se
    WHERE se."vehicleId" = ${args.vehicleId}
      AND se."installedPartsJson" IS NOT NULL
      AND (
        (
          jsonb_typeof(se."installedPartsJson") = 'object'
          AND se."installedPartsJson"->>'source' = 'wishlist'
          AND se."installedPartsJson"->>'wishlistItemId' = ${args.itemId}
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(se."installedPartsJson") = 'array' THEN se."installedPartsJson"
              ELSE '[]'::jsonb
            END
          ) AS elem
          WHERE elem->>'source' = 'wishlist'
            AND elem->>'wishlistItemId' = ${args.itemId}
        )
      )
  `;

  for (const row of fromJson) {
    serviceEventIds.add(row.id);
  }

  for (const serviceEventId of serviceEventIds) {
    const ev = await tx.serviceEvent.findFirst({
      where: { id: serviceEventId, vehicleId: args.vehicleId },
      select: { comment: true },
    });
    if (!ev) {
      continue;
    }
    const nextComment = appendBoundedServiceEventComment(ev.comment, note, maxLen);
    if (nextComment === (ev.comment ?? "").trim()) {
      continue;
    }
    await tx.serviceEvent.update({
      where: { id: serviceEventId },
      data: { comment: nextComment },
    });
  }
}
