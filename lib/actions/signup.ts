"use server";

import { getLocale, getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { generateUniqueStatusPageSlug } from "@/lib/generate-unique-status-slug";
import { signIn } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { isUniqueViolation } from "@/lib/is-unique-violation";
import { buildSignupFormSchema, type SignupFormValues } from "@/lib/validation/monitor";

export async function signupAction(
  values: SignupFormValues,
): Promise<{ error: string } | undefined> {
  const [tValidation, tSignup, locale] = await Promise.all([
    getTranslations("auth.validation"),
    getTranslations("auth.signup"),
    getLocale(),
  ]);

  const schema = buildSignupFormSchema((key) => tValidation(key));
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { error: tSignup("errorInvalid") };
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: tSignup("errorEmailTaken") };
  }

  const passwordHash = await hashPassword(password);
  try {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        statusPageSlug: await generateUniqueStatusPageSlug(name),
      },
    });
  } catch (err) {
    if (isUniqueViolation(err, "email")) return { error: tSignup("errorEmailTaken") };
    throw err;
  }

  await signIn("credentials", { email, password, redirect: false });
  redirect({ href: "/dashboard", locale });
}
