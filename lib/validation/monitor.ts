import { z } from "zod";

export const httpMethods = ["GET", "POST", "PUT", "HEAD"] as const;

export type MonitorFormValues = {
  name: string;
  url: string;
  method: (typeof httpMethods)[number];
  expectedStatus: number;
  intervalSeconds: number;
  isActive: boolean;
  isPublic: boolean;
};

export type SignupFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type LoginFormValues = {
  email: string;
  password: string;
};

type MonitorFormTranslator = (key: "name" | "url" | "urlInvalid" | "intervalMin") => string;

export function buildMonitorFormSchema(t: MonitorFormTranslator) {
  return z.object({
    name: z.string().trim().min(1, t("name")).max(100),
    // Same rule as the REST API: only http(s), never javascript:, file:, etc.
    url: z.url({ protocol: /^https?$/, error: t("urlInvalid") }),
    method: z.enum(httpMethods),
    expectedStatus: z.number().int().min(100).max(599),
    intervalSeconds: z.number().int().min(60, t("intervalMin")).max(86400),
    isActive: z.boolean(),
    isPublic: z.boolean(),
  });
}

type AuthValidationTranslator = (
  key: "nameRequired" | "emailInvalid" | "passwordMin" | "passwordRequired" | "passwordsMismatch",
) => string;

// Emails are stored lowercase so "Ada@x.com" and "ada@x.com" are one account.
function normalizedEmail(message: string) {
  return z.string().trim().toLowerCase().pipe(z.email(message));
}

export function buildSignupFormSchema(t: AuthValidationTranslator) {
  return z
    .object({
      name: z.string().trim().min(1, t("nameRequired")).max(100),
      email: normalizedEmail(t("emailInvalid")),
      password: z.string().min(8, t("passwordMin")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordsMismatch"),
      path: ["confirmPassword"],
    });
}

export function buildLoginFormSchema(t: AuthValidationTranslator) {
  return z.object({
    email: normalizedEmail(t("emailInvalid")),
    password: z.string().min(1, t("passwordRequired")),
  });
}
