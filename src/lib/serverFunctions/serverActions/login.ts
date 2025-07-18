"use server";

import { prisma } from "@/lib/prisma";
import { auth, signIn, signOut } from "@auth/auth";
import { userLoginSchema } from "@zodValidators";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

const _login = async (
  prevState: { statusCode: number } | null,
  formData: FormData,
): Promise<{ statusCode: number } | null> => {
  try {
    const session = await auth();
    if (session) {
      await signOut({ redirect: false });
    }
    const loginUser = userLoginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const userExists = await prisma.user.findUnique({
      where: {
        email: loginUser.email,
        active: true,
      },
    });

    if (!userExists || !userExists.password || !userExists.email) {
      return { statusCode: 404 };
    }
    await signIn("credentials", {
      email: loginUser.email,
      password: loginUser.password,
      redirectTo: "/admin/home",
    });
    return { statusCode: 200 };
  } catch (e) {
    if (isRedirectError(e)) {
      throw e;
    }
    if (e instanceof AuthError) {
      switch (e.type) {
        case "CredentialsSignin":
          return { statusCode: 401 };
        default:
          return { statusCode: 401 };
      }
    }
    return { statusCode: 401 };
  }
};

export default _login;
