'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlaceAutocomplete } from '@/components/maps/PlaceAutocomplete';

const schema = z.object({
  name: z.string().min(1, '場所名は必須です'),
  address: z.string().optional(),
  placeId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  shootingDuration: z.coerce.number().int().min(1, '1以上'),
  bufferBefore: z.coerce.number().int().min(0).max(60),
  bufferAfter: z.coerce.number().int().min(0).max(60),
  hasMeal: z.boolean().default(false),
  mealType: z.enum(['breakfast', 'lunch', 'dinner']).optional(),
  mealDuration: z.coerce.number().int().min(5).max(180).default(60),
  timeSlot: z.enum(['normal', 'early_morning', 'night', 'flexible']).default('normal'),
  timeSlotStart: z.string().optional(),
  timeSlotEnd: z.string().optional(),
  priority: z.enum(['required', 'high', 'medium', 'low']).default('medium'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (data: FormValues) => Promise<void>;
  isLoading?: boolean;
}

const MEAL_LABELS = { breakfast: '朝食', lunch: '昼食', dinner: '夕食' };
const TIME_SLOT_LABELS = {
  normal: '通常',
  early_morning: '早朝撮影',
  night: '夜間撮影',
  flexible: 'フレキシブル',
};
const PRIORITY_LABELS = {
  required: '必須',
  high: '高',
  medium: '中',
  low: '低',
};

export function LocationForm({ onSubmit, isLoading }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      address: '',
      notes: '',
      shootingDuration: 60,
      bufferBefore: 10,
      bufferAfter: 10,
      hasMeal: false,
      mealDuration: 60,
      timeSlot: 'normal',
      priority: 'medium',
    },
  });

  const hasMeal = form.watch('hasMeal');
  const timeSlot = form.watch('timeSlot');

  const handlePlaceSelect = (details: { name: string; address: string; lat: number; lng: number; placeId: string }) => {
    form.setValue('name', details.name);
    form.setValue('address', details.address);
    form.setValue('lat', details.lat);
    form.setValue('lng', details.lng);
    form.setValue('placeId', details.placeId);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <FormLabel className="text-sm font-medium">場所を検索</FormLabel>
          <div className="mt-1">
            <PlaceAutocomplete onSelect={handlePlaceSelect} placeholder="施設名・住所で検索..." />
          </div>
        </div>

        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>場所名 *</FormLabel>
            <FormControl><Input {...field} placeholder="例: 東京タワー" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem>
            <FormLabel>住所</FormLabel>
            <FormControl><Input {...field} placeholder="例: 東京都港区芝公園4丁目2-8" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* バッファ・撮影時間 */}
        <div className="grid grid-cols-3 gap-3">
          <FormField control={form.control} name="bufferBefore" render={({ field }) => (
            <FormItem>
              <FormLabel>到着バッファ（分）</FormLabel>
              <FormControl>
                <Input type="number" min={0} max={60} step={5} {...field} />
              </FormControl>
              <FormDescription className="text-xs">準備・移動 0〜60分</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="shootingDuration" render={({ field }) => (
            <FormItem>
              <FormLabel>撮影時間（分）*</FormLabel>
              <FormControl><Input type="number" min={1} step={5} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="bufferAfter" render={({ field }) => (
            <FormItem>
              <FormLabel>撤収バッファ（分）</FormLabel>
              <FormControl>
                <Input type="number" min={0} max={60} step={5} {...field} />
              </FormControl>
              <FormDescription className="text-xs">片付け・移動 0〜60分</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* 食事チェック */}
        <FormField control={form.control} name="hasMeal" render={({ field }) => (
          <FormItem className="flex items-center gap-2 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="font-normal">この場所で食事あり</FormLabel>
          </FormItem>
        )} />

        {hasMeal && (
          <div className="grid grid-cols-2 gap-3 pl-6">
            <FormField control={form.control} name="mealType" render={({ field }) => (
              <FormItem>
                <FormLabel>食事の種類</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="選択" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(MEAL_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="mealDuration" render={({ field }) => (
              <FormItem>
                <FormLabel>食事時間（分）</FormLabel>
                <FormControl>
                  <Input type="number" min={5} max={180} step={5} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        )}

        {/* 撮影時間帯 */}
        <FormField control={form.control} name="timeSlot" render={({ field }) => (
          <FormItem>
            <FormLabel>撮影時間帯</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.entries(TIME_SLOT_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {(timeSlot === 'early_morning' || timeSlot === 'night') && (
          <div className="grid grid-cols-2 gap-3 pl-4">
            <FormField control={form.control} name="timeSlotStart" render={({ field }) => (
              <FormItem>
                <FormLabel>開始時刻</FormLabel>
                <FormControl><Input type="time" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="timeSlotEnd" render={({ field }) => (
              <FormItem>
                <FormLabel>終了時刻</FormLabel>
                <FormControl><Input type="time" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        )}

        {/* 優先度 */}
        <FormField control={form.control} name="priority" render={({ field }) => (
          <FormItem>
            <FormLabel>優先度</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>備考</FormLabel>
            <FormControl><Input {...field} placeholder="任意のメモ" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '追加中...' : '撮影地を追加'}
        </Button>
      </form>
    </Form>
  );
}
