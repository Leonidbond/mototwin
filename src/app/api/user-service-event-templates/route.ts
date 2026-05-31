import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addServiceEventFormValuesFromUserTemplateJson,
  buildUserServiceEventTemplateTitle,
  createInitialAddServiceEventFormValues,
  stripAddServiceEventFormValuesForUserTemplate,
} from "@mototwin/domain";
import type { ServiceEventMode } from "@mototwin/types";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../_shared/current-user-context";
import { boundedJsonValue, strictObject } from "@/lib/http/input-validation";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";

const postBodySchema = strictObject({
  baseTitle: z.string().max(200).optional().nullable(),
  // MT-SEC-067: form snapshots are opaque, but we still cap them at 128 KB
  // serialized and 20 levels deep to prevent DB bloat / parser DoS.
  formSnapshot: boundedJsonValue({ maxSerializedBytes: 128 * 1024, maxDepth: 20 }),
  includeInPartPicker: z.boolean().optional(),
});

function toMode(value: string): ServiceEventMode {
  return value === "ADVANCED" ? "ADVANCED" : "BASIC";
}

function wireFromRow(row: {
  id: string;
  title: string;
  mode: string;
  updatedAt: Date;
  formJson: unknown;
  includeInPartPicker?: boolean | null;
}) {
  const mode = toMode(row.mode);
  const form =
    addServiceEventFormValuesFromUserTemplateJson(row.formJson) ?? createInitialAddServiceEventFormValues();
  return {
    id: row.id,
    title: row.title,
    mode,
    updatedAt: row.updatedAt.toISOString(),
    form,
    includeInPartPicker: row.includeInPartPicker ?? true,
  };
}

export async function GET() {
  try {
    const currentUser = await getCurrentUserContext();
    const rows = await prisma.userServiceEventFormTemplate.findMany({
      where: { userId: currentUser.userId },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({
      templates: rows.map((row) => wireFromRow(row)),
    });
  } catch (error) {
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) {
      return ctxErr;
    }
    console.error("Failed to list user service event form templates:", error);
    return NextResponse.json({ error: "Failed to list templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUserContext();
    // MT-SEC-069: 144 KB ≈ formSnapshot cap (128 KB) + envelope (baseTitle, flags).
    const json = await parseJsonBody<unknown>(request, { maxBytes: 144 * 1024 });
    const parsed = postBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Неверный формат запроса." }, { status: 400 });
    }

    const normalized = addServiceEventFormValuesFromUserTemplateJson(parsed.data.formSnapshot);
    if (!normalized) {
      return NextResponse.json({ error: "Не удалось разобрать снимок формы." }, { status: 400 });
    }

    const toPersist = stripAddServiceEventFormValuesForUserTemplate(normalized);
    const base = (parsed.data.baseTitle ?? "").trim() || normalized.title.trim();
    const title = buildUserServiceEventTemplateTitle(base, normalized.mode);

    let formJson: Prisma.InputJsonValue;
    try {
      formJson = JSON.parse(JSON.stringify(toPersist)) as Prisma.InputJsonValue;
    } catch (serializeErr) {
      console.error("User template formJson serialization failed:", serializeErr);
      return NextResponse.json(
        { error: "Снимок формы не удалось сериализовать для сохранения." },
        { status: 400 }
      );
    }

    const includeInPartPicker = parsed.data.includeInPartPicker ?? true;

    let created;
    try {
      created = await prisma.userServiceEventFormTemplate.create({
        data: {
          userId: currentUser.userId,
          title,
          mode: normalized.mode,
          formJson,
          includeInPartPicker,
        },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Unknown argument") &&
        error.message.includes("includeInPartPicker")
      ) {
        created = await prisma.userServiceEventFormTemplate.create({
          data: {
            userId: currentUser.userId,
            title,
            mode: normalized.mode,
            formJson,
          },
        });
      } else {
        throw error;
      }
    }

    return NextResponse.json({ template: wireFromRow(created) });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) {
      return ctxErr;
    }
    console.error("Failed to create user service event form template:", error);
    const detail =
      error instanceof Error && error.message.trim() ? error.message.trim() : "";
    const dev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error:
          dev && detail
            ? `Не удалось сохранить шаблон (${detail})`
            : "Не удалось сохранить шаблон. Повторите позже.",
      },
      { status: 500 }
    );
  }
}
