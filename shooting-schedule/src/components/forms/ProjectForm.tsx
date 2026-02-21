'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  durationMode: z.enum(['fixed', 'auto']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  workStartTime: z.string().default('09:00'),
  workEndTime: z.string().default('18:00'),
  allowEarlyMorning: z.boolean().default(false),
  earlyMorningStart: z.string().default('05:00'),
  allowNightShooting: z.boolean().default(false),
  nightShootingEnd: z.string().default('22:00'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<FormValues>;
  onSubmit: (data: FormValues) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function ProjectForm({ defaultValues, onSubmit, submitLabel = '作成', isLoading }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      // Zod v4 + @hookform/resolvers v3: string フィールドは必ず '' を設定（undefined だと ZodError 発生）
      title: '',
      description: '',
      durationMode: 'fixed',
      startDate: '',
      endDate: '',
      workStartTime: '09:00',
      workEndTime: '18:00',
      allowEarlyMorning: false,
      earlyMorningStart: '05:00',
      allowNightShooting: false,
      nightShootingEnd: '22:00',
      ...defaultValues,
    },
  });

  const durationMode = form.watch('durationMode');
  const allowEarlyMorning = form.watch('allowEarlyMorning');
  const allowNightShooting = form.watch('allowNightShooting');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>基本情報</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>プロジェクト名 *</FormLabel>
                <FormControl><Input {...field} placeholder="例: 〇〇ドラマ ロケハン" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>概要</FormLabel>
                <FormControl><Input {...field} placeholder="プロジェクトの説明（任意）" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>撮影期間設定</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="durationMode" render={({ field }) => (
              <FormItem>
                <FormLabel>期間モード</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="fixed">日程固定（開始・終了日を指定）</SelectItem>
                    <SelectItem value="auto">自動算出（必要日数を計算）</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {durationMode === 'fixed' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>開始日</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>終了日</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>稼働時間設定</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="workStartTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>稼働開始時刻</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="workEndTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>稼働終了時刻</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="allowEarlyMorning" render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">早朝撮影あり</FormLabel>
              </FormItem>
            )} />
            {allowEarlyMorning && (
              <FormField control={form.control} name="earlyMorningStart" render={({ field }) => (
                <FormItem>
                  <FormLabel>早朝開始時刻</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="allowNightShooting" render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">夜間撮影あり</FormLabel>
              </FormItem>
            )} />
            {allowNightShooting && (
              <FormField control={form.control} name="nightShootingEnd" render={({ field }) => (
                <FormItem>
                  <FormLabel>夜間終了時刻</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '処理中...' : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
