import { z } from "zod";
import { boundedInt, boundedText, boundedTextOptional, strictObject } from "@/lib/http/input-validation";

export const createCatalogRequestSchema = strictObject({
  motorcycleBrandId: boundedText({ max: 64 }).optional(),
  brandName: boundedTextOptional({ max: 120 }),
  motorcycleModelFamilyId: boundedText({ max: 64 }).optional(),
  familyName: boundedTextOptional({ max: 120 }),
  motorcycleVariantId: boundedText({ max: 64 }).optional(),
  variantName: boundedTextOptional({ max: 160 }),
  yearFrom: boundedInt({ min: 1900, max: 2100 }),
  yearTo: boundedInt({ min: 1900, max: 2100 }).nullable().optional(),
  userComment: boundedTextOptional({ max: 1000 }),
}).superRefine((data, ctx) => {
  if (!data.motorcycleBrandId?.trim() && !data.brandName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Укажите марку или выберите из списка.",
      path: ["brandName"],
    });
  }
  if (!data.motorcycleModelFamilyId?.trim() && !data.familyName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Укажите модель или выберите из списка.",
      path: ["familyName"],
    });
  }
  if (!data.motorcycleVariantId?.trim() && !data.variantName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Укажите модификацию или выберите из списка.",
      path: ["variantName"],
    });
  }
  if (data.yearTo != null && data.yearTo < data.yearFrom) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Год окончания не может быть раньше года начала.",
      path: ["yearTo"],
    });
  }
});

export const catalogRequestResolvedFieldsSchema = strictObject({
  brandName: boundedText({ min: 1, max: 120 }),
  familyName: boundedText({ min: 1, max: 120 }),
  variantName: boundedText({ min: 1, max: 160 }),
  yearFrom: boundedInt({ min: 1900, max: 2100 }),
  yearTo: boundedInt({ min: 1900, max: 2100 }).nullable().optional(),
  moderationComment: boundedTextOptional({ max: 1000 }),
});
