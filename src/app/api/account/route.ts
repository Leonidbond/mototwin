import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
  DeleteUserAccountError,
  deleteUserAccount,
} from "@/lib/auth/delete-user-account";
import { revokeRefreshToken, revokeWebSession } from "@/lib/auth/session-service";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { strictObject } from "@/lib/http/input-validation";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../_shared/current-user-context";

const NEXT_AUTH_SESSION_COOKIE_BASE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "__Host-next-auth.session-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "__Host-authjs.session-token",
] as const;

const deleteAccountSchema = strictObject({
  confirmation: z.literal("DELETE"),
  refreshToken: z.string().trim().max(4096).optional(),
});

function clearAuthJsSessionCookies(response: NextResponse) {
  for (const baseName of NEXT_AUTH_SESSION_COOKIE_BASE_NAMES) {
    response.cookies.set(baseName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    for (let idx = 0; idx < 6; idx += 1) {
      response.cookies.set(`${baseName}.${idx}`, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUserContext();
    const body = await parseJsonBody<unknown>(request, { maxBytes: 4 * 1024 });
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Для удаления аккаунта отправьте confirmation: \"DELETE\"." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (sessionCookie) {
      await revokeWebSession(sessionCookie);
    }
    if (parsed.data.refreshToken) {
      await revokeRefreshToken(parsed.data.refreshToken);
    }

    await deleteUserAccount(currentUser.userId);

    const response = NextResponse.json({ deleted: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    clearAuthJsSessionCookies(response);
    return response;
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof DeleteUserAccountError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : error.code === "ADMIN_ACCOUNT"
            ? 403
            : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to delete account:", error);
    return NextResponse.json({ error: "Не удалось удалить аккаунт." }, { status: 500 });
  }
}
