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

const postBodySchema = z
  .object({
    baseTitle: z.string().max(200).optional().nullable(),
    formSnapshot: z.unknown(),
  })
  .strict();

function toMode(value: string): ServiceEventMode {
  return value === "ADVANCED" ? "ADVANCED" : "BASIC";
}

function wireFromRow(row: {
  id: string;
  title: string;
  mode: string;
  updatedAt: Date;
  formJson: unknown;
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
    const json = await request.json();
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

    const created = await prisma.userServiceEventFormTemplate.create({
      data: {
        userId: currentUser.userId,
        title,
        mode: normalized.mode,
        formJson,
      },
    });

    return NextResponse.json({ template: wireFromRow(created) });
  } catch (error) {
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
