'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceAutocomplete } from '@/components/maps/PlaceAutocomplete';

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
  // 出発地
  departureLocation: z.string().optional(),
  departureLat: z.number().optional(),
  departureLng: z.number().optional(),
  departurePlaceId: z.string().optional(),
  // 解散場所
  returnSameAsDeparture: z.boolean().default(true),
  returnLocation: z.string().optional(),
  returnLat: z.number().optional(),
  returnLng: z.number().optional(),
  returnPlaceId: z.string().optional(),
  // 移動手段
  transportModeToLocation: z.enum(['transit', 'car', 'other']).default('car'),
  defaultTransportMode: z.enum(['driving', 'transit', 'walking', 'bicycling']).default('driving'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<FormValues>;
  onSubmit: (data: FormValues) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
}

const TRANSPORT_MODE_LABELS: Record<string, string> = {
  driving: '車（レンタカー等）',
  transit: '公共交通機関',
  walking: '徒歩',
  bicycling: '自転車',
};

export function ProjectForm({ defaultValues, onSubmit, submitLabel = '作成', isLoading }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      durationMode: 'fixed',
      workStartTime: '09:00',
      workEndTime: '18:00',
      allowEarlyMorning: false,
      earlyMorningStart: '05:00',
      allowNightShooting: false,
      nightShootingEnd: '22:00',
      returnSameAsDeparture: true,
      transportModeToLocation: 'car',
      defaultTransportMode: 'driving',
      ...defaultValues,
    },
  });

  const durationMode = form.watch('durationMode');
  const allowEarlyMorning = form.watch('allowEarlyMorning');
  const allowNightShooting = form.watch('allowNightShooting');
  const returnSameAsDeparture = form.watch('returnSameAsDeparture');

  const handleDepartureSelect = (details: { name: string; address: string; lat: number; lng: number; placeId: string }) => {
    form.setValue('departureLocation', details.name);
    form.setValue('departureLat', details.lat);
    form.setValue('departureLng', details.lng);
    form.setValue('departurePlaceId', details.placeId);
  };

  const handleReturnSelect = (details: { name: string; address: string; lat: number; lng: number; placeId: string }) => {
    form.setValue('returnLocation', details.name);
    form.setValue('returnLat', details.lat);
    form.setValue('returnLng', details.lng);
    form.setValue('returnPlaceId', details.placeId);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 基本情報 */}
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

        {/* 出発地・解散場所 */}
        <Card>
          <CardHeader><CardTitle>出発地・解散場所</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <FormLabel className="text-sm font-medium">出発地（撮影初日の出発地点）</FormLabel>
              <div className="mt-1">
                <PlaceAutocomplete
                  onSelect={handleDepartureSelect}
                  placeholder="例: 東京駅、自社スタジオ..."
                />
              </div>
              {form.watch('departureLocation') && (
                <p className="text-xs text-muted-foreground mt-1">
                  選択中: {form.watch('departureLocation')}
                </p>
              )}
            </div>

            <FormField control={form.control} name="returnSameAsDeparture" render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">解散場所は出発地と同じ</FormLabel>
              </FormItem>
            )} />

            {!returnSameAsDeparture && (
              <div>
                <FormLabel className="text-sm font-medium">解散場所（撮影最終日の到着地点）</FormLabel>
                <div className="mt-1">
                  <PlaceAutocomplete
                    onSelect={handleReturnSelect}
                    placeholder="例: 新大阪駅、ホテル..."
                  />
                </div>
                {form.watch('returnLocation') && (
                  <p className="text-xs text-muted-foreground mt-1">
                    選択中: {form.watch('returnLocation')}
                  </p>
                )}
              </div>
            )}

            <FormField control={form.control} name="transportModeToLocation" render={({ field }) => (
              <FormItem>
                <FormLabel>現地までの移動手段</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="transit">公共交通機関</SelectItem>
                    <SelectItem value="car">車</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="defaultTransportMode" render={({ field }) => (
              <FormItem>
                <FormLabel>現地での移動手段</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(TRANSPORT_MODE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  Google Distance Matrix API でこの移動手段の所要時間を取得します
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* 撮影期間設定 */}
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

            {durationMode === 'fixed' ? (
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
            ) : (
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>開始日</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormDescription className="text-xs">終了日は全地点を回るのに必要な日数から自動算出されます</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            )}
          </CardContent>
        </Card>

        {/* 稼働時間設定 */}
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
                <FormLabel className="font-normal">早朝撮影あり（朝焼け・早朝の人が少ない時間帯等）</FormLabel>
              </FormItem>
            )} />
            {allowEarlyMorning && (
              <FormField control={form.control} name="earlyMorningStart" render={({ field }) => (
                <FormItem>
                  <FormLabel>早朝開始時刻</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormDescription className="text-xs">この時刻より前に早朝撮影地点を配置します</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="allowNightShooting" render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">夜間撮影あり（夜景・ライトアップ等）</FormLabel>
              </FormItem>
            )} />
            {allowNightShooting && (
              <FormField control={form.control} name="nightShootingEnd" render={({ field }) => (
                <FormItem>
                  <FormLabel>夜間終了時刻</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormDescription className="text-xs">夜間撮影はこの時刻までに終了します</FormDescription>
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
