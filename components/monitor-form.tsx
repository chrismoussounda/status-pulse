"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import {
  buildMonitorFormSchema,
  httpMethods,
  type MonitorFormValues,
} from "@/lib/validation/monitor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type MonitorFormProps = {
  defaultValues?: Partial<MonitorFormValues>;
  onSubmitAction: (values: MonitorFormValues) => Promise<{ error: string } | undefined>;
  mode: "create" | "edit";
};

const DEFAULT_VALUES: MonitorFormValues = {
  name: "",
  url: "",
  method: "GET",
  expectedStatus: 200,
  intervalSeconds: 300,
  isActive: true,
  isPublic: true,
};

export function MonitorForm({ defaultValues, onSubmitAction, mode }: MonitorFormProps) {
  const t = useTranslations("monitorForm");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      buildMonitorFormSchema((key) =>
        key === "urlInvalid"
          ? t("urlInvalid")
          : key === "intervalMin"
            ? t("intervalMin")
            : t("name"),
      ),
    [t],
  );

  const form = useForm<MonitorFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  function onSubmit(values: MonitorFormValues) {
    setFormError(null);
    startTransition(async () => {
      const result = await onSubmitAction(values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name")}</FormLabel>
              <FormControl>
                <Input placeholder={t("namePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("url")}</FormLabel>
              <FormControl>
                <Input placeholder={t("urlPlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("method")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {httpMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expectedStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("expectedStatus")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="intervalSeconds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("interval")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormDescription>{t("intervalDescription")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3">
                <div className="space-y-0.5">
                  <FormLabel>{t("active")}</FormLabel>
                  <FormDescription>{t("activeDescription")}</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isPublic"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3">
                <div className="space-y-0.5">
                  <FormLabel>{t("public")}</FormLabel>
                  <FormDescription>{t("publicDescription")}</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
        <Button type="submit" disabled={isPending} className="h-10 self-start px-6">
          {isPending ? t("saving") : mode === "create" ? t("createSubmit") : t("editSubmit")}
        </Button>
      </form>
    </Form>
  );
}
