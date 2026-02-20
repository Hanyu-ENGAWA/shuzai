'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlaceAutocomplete } from '@/components/maps/PlaceAutocomplete';

const schema = z.object({
  name: z.string().min(1, '施設名は必須です'),
  address: z.string().optional(),
  placeId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  nights: z.coerce.number().int().min(1).optional(),
  budgetPerNight: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (data: FormValues) => Promise<void>;
  isLoading?: boolean;
}

export function AccommodationForm({ onSubmit, isLoading }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', checkInTime: '15:00', checkOutTime: '10:00' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <FormLabel className="text-sm font-medium">宿泊施設を検索</FormLabel>
          <div className="mt-1">
            <PlaceAutocomplete
              onSelect={(d) => {
                form.setValue('name', d.name);
                form.setValue('address', d.address);
                form.setValue('lat', d.lat);
                form.setValue('lng', d.lng);
                form.setValue('placeId', d.placeId);
              }}
              placeholder="ホテル名・住所で検索..."
            />
          </div>
        </div>

        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>施設名 *</FormLabel>
            <FormControl><Input {...field} placeholder="例: ホテルニューオータニ" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem>
            <FormLabel>住所</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="checkInDate" render={({ field }) => (
            <FormItem>
              <FormLabel>チェックイン日</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="checkOutDate" render={({ field }) => (
            <FormItem>
              <FormLabel>チェックアウト日</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="checkInTime" render={({ field }) => (
            <FormItem>
              <FormLabel>チェックイン時刻</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="checkOutTime" render={({ field }) => (
            <FormItem>
              <FormLabel>チェックアウト時刻</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="nights" render={({ field }) => (
            <FormItem>
              <FormLabel>泊数</FormLabel>
              <FormControl><Input type="number" min={1} {...field} placeholder="例: 2" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="budgetPerNight" render={({ field }) => (
            <FormItem>
              <FormLabel>1泊予算（円）</FormLabel>
              <FormControl><Input type="number" min={0} {...field} placeholder="例: 10000" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>備考</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '追加中...' : '宿泊地を追加'}
        </Button>
      </form>
    </Form>
  );
}
