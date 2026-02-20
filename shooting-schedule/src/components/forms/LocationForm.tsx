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
  bufferBefore: z.coerce.number().int().min(0),
  bufferAfter: z.coerce.number().int().min(0),
  hasMeal: z.boolean().default(false),
  mealType: z.enum(['breakfast', 'lunch', 'dinner']).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (data: FormValues) => Promise<void>;
  isLoading?: boolean;
}

const MEAL_LABELS = { breakfast: '朝食', lunch: '昼食', dinner: '夕食' };

export function LocationForm({ onSubmit, isLoading }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      shootingDuration: 60,
      bufferBefore: 0,
      bufferAfter: 0,
      hasMeal: false,
    },
  });

  const hasMeal = form.watch('hasMeal');

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

        <div className="grid grid-cols-3 gap-3">
          <FormField control={form.control} name="bufferBefore" render={({ field }) => (
            <FormItem>
              <FormLabel>前バッファ（分）</FormLabel>
              <FormControl><Input type="number" min={0} {...field} /></FormControl>
              <FormDescription className="text-xs">準備時間</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="shootingDuration" render={({ field }) => (
            <FormItem>
              <FormLabel>撮影時間（分）*</FormLabel>
              <FormControl><Input type="number" min={1} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="bufferAfter" render={({ field }) => (
            <FormItem>
              <FormLabel>後バッファ（分）</FormLabel>
              <FormControl><Input type="number" min={0} {...field} /></FormControl>
              <FormDescription className="text-xs">片付け時間</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="hasMeal" render={({ field }) => (
          <FormItem className="flex items-center gap-2 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="font-normal">この場所で食事あり</FormLabel>
          </FormItem>
        )} />

        {hasMeal && (
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
        )}

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
