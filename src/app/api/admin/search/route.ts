import { NextResponse } from "next/server";
import type {
  AdminSearchGroupWire,
  AdminSearchHitWire,
} from "@mototwin/types";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const MAX_PER_GROUP = 5;

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    const query = (url.searchParams.get("q") ?? "").trim();
    if (query.length < 2) {
      return NextResponse.json({
        query,
        groups: [],
        totalHits: 0,
      });
    }

    const groups: AdminSearchGroupWire[] = [];

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { displayName: { contains: query, mode: "insensitive" } },
        ],
      },
      take: MAX_PER_GROUP,
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, displayName: true, adminRole: true },
    });
    if (users.length > 0) {
      groups.push({
        kind: "user",
        label: "Пользователи",
        hits: users.map<AdminSearchHitWire>((user) => ({
          kind: "user",
          id: user.id,
          title: user.displayName ?? user.email ?? "—",
          subtitle: user.email ?? user.adminRole ?? "",
          href: `/admin/users/${user.id}`,
        })),
      });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: {
        trashedAt: null,
        OR: [
          { vin: { contains: query, mode: "insensitive" } },
          { nickname: { contains: query, mode: "insensitive" } },
          { model: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      take: MAX_PER_GROUP,
      include: {
        brand: { select: { name: true } },
        model: { select: { name: true } },
        modelVariant: { select: { year: true, versionName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    if (vehicles.length > 0) {
      groups.push({
        kind: "vehicle",
        label: "Мотоциклы",
        hits: vehicles.map<AdminSearchHitWire>((vehicle) => ({
          kind: "vehicle",
          id: vehicle.id,
          title: vehicle.nickname || `${vehicle.brand.name} ${vehicle.model.name}`,
          subtitle: `${vehicle.modelVariant.year} · ${vehicle.modelVariant.versionName}${
            vehicle.vin ? ` · VIN ${vehicle.vin.slice(-6)}` : ""
          }`,
          href: `/admin/vehicles/${vehicle.id}`,
        })),
      });
    }

    const variants = await prisma.modelVariant.findMany({
      where: {
        OR: [
          { versionName: { contains: query, mode: "insensitive" } },
          { model: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      take: MAX_PER_GROUP,
      include: { model: { include: { brand: true } } },
    });
    if (variants.length > 0) {
      groups.push({
        kind: "model",
        label: "Модели",
        hits: variants.map<AdminSearchHitWire>((variant) => ({
          kind: "model",
          id: variant.id,
          title: `${variant.model.brand.name} ${variant.model.name} ${variant.year}`,
          subtitle: variant.versionName,
          href: `/admin/models/${variant.id}`,
        })),
      });
    }

    const parts = await prisma.partMaster.findMany({
      where: {
        OR: [
          { sku: { contains: query, mode: "insensitive" } },
          { brandName: { contains: query, mode: "insensitive" } },
          { title: { contains: query, mode: "insensitive" } },
          { aliases: { some: { normalized: { contains: query.toLowerCase() } } } },
        ],
      },
      take: MAX_PER_GROUP,
      orderBy: { updatedAt: "desc" },
    });
    if (parts.length > 0) {
      groups.push({
        kind: "part",
        label: "Детали",
        hits: parts.map<AdminSearchHitWire>((part) => ({
          kind: "part",
          id: part.id,
          title: `${part.brandName} ${part.sku}`,
          subtitle: part.title,
          href: `/admin/catalog/${part.id}`,
        })),
      });
    }

    const reports = await prisma.fitmentReport.findMany({
      where: {
        OR: [
          { partMaster: { sku: { contains: query, mode: "insensitive" } } },
          { partMaster: { title: { contains: query, mode: "insensitive" } } },
          { node: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      take: MAX_PER_GROUP,
      orderBy: { createdAt: "desc" },
      include: {
        partMaster: { select: { brandName: true, sku: true } },
        node: { select: { name: true } },
      },
    });
    if (reports.length > 0) {
      groups.push({
        kind: "fitment-report",
        label: "Fitment-отчеты",
        hits: reports.map<AdminSearchHitWire>((report) => ({
          kind: "fitment-report",
          id: report.id,
          title: report.partMaster
            ? `${report.partMaster.brandName} ${report.partMaster.sku}`
            : "Fitment-отчет",
          subtitle: report.node?.name ?? "",
          href: `/admin/fitment/reports/${report.id}`,
        })),
      });
    }

    const totalHits = groups.reduce((sum, g) => sum + g.hits.length, 0);
    return NextResponse.json({ query, groups, totalHits });
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/search:", error);
    return NextResponse.json({ error: "Не удалось выполнить поиск" }, { status: 500 });
  }
}
