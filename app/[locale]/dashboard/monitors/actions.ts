"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/navigation";
import { buildMonitorFormSchema, type MonitorFormValues } from "@/lib/validation/monitor";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user) notFound();
  return session.user.id;
}

async function parseMonitorValues(values: MonitorFormValues) {
  const t = await getTranslations("monitorForm");
  const schema = buildMonitorFormSchema((key) => t(key));
  return schema.safeParse(values);
}

export async function createMonitor(
  values: MonitorFormValues,
): Promise<{ error: string } | undefined> {
  const [userId, locale, parsed] = await Promise.all([
    requireUserId(),
    getLocale(),
    parseMonitorValues(values),
  ]);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid" };

  await prisma.monitor.create({ data: { ...parsed.data, userId } });
  revalidatePath("/dashboard");
  redirect({ href: "/dashboard", locale });
}

export async function updateMonitor(
  id: string,
  values: MonitorFormValues,
): Promise<{ error: string } | undefined> {
  const [userId, locale, parsed] = await Promise.all([
    requireUserId(),
    getLocale(),
    parseMonitorValues(values),
  ]);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid" };

  const existing = await prisma.monitor.findFirst({ where: { id, userId } });
  if (!existing) notFound();

  await prisma.monitor.update({ where: { id }, data: parsed.data });
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/monitors/${id}`);
  redirect({ href: `/dashboard/monitors/${id}`, locale });
}

export async function deleteMonitor(id: string): Promise<void> {
  const [userId, locale] = await Promise.all([requireUserId(), getLocale()]);
  const existing = await prisma.monitor.findFirst({ where: { id, userId } });
  if (!existing) notFound();

  await prisma.monitor.delete({ where: { id } });
  revalidatePath("/dashboard");
  redirect({ href: "/dashboard", locale });
}

export async function toggleMonitorActive(
  id: string,
  isActive: boolean,
): Promise<{ error: string } | undefined> {
  const userId = await requireUserId();
  const existing = await prisma.monitor.findFirst({ where: { id, userId } });
  if (!existing) notFound();

  await prisma.monitor.update({ where: { id }, data: { isActive } });
  revalidatePath("/dashboard");
  return undefined;
}
