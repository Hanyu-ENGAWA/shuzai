'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlaceAutocomplete } from '@/components/maps/PlaceAutocomplete';

const schema = z.object({
  name: z.string().min(1, '店名は必須です'),
  address: z.string().optional(),
  placeId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner']),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  duration: z.coerce.number().int().min(1).default(60),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (data: FormValues) => Promise<void>;
  isLoading?: boolean;
}

export function MealForm({ onSubmit, isLoading }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mealType: 'lunch', duration: 60 },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <FormLabel className="text-sm font-medium">食事場所を検索</FormLabel>
          <div className="mt-1">
            <PlaceAutocomplete
              onSelect={(d) => {
                form.setValue('name', d.name);
                form.setValue('address', d.address);
                form.setValue('lat', d.lat);
                form.setValue('lng', d.lng);
                form.setValue('placeId', d.placeId);
              }}
              placeholder="レストラン名・住所で検索..."
            />
          </div>
        </div>

        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>店名 *</FormLabel>
            <FormControl><Input {...field} placeholder="例: 〇〇レストラン" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="mealType" render={({ field }) => (
          <FormItem>
            <FormLabel>食事種別 *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="breakfast">朝食</SelectItem>
                <SelectItem value="lunch">昼食</SelectItem>
                <SelectItem value="dinner">夕食</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="scheduledDate" render={({ field }) => (
            <FormItem>
              <FormLabel>予定日</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="scheduledTime" render={({ field }) => (
            <FormItem>
              <FormLabel>予定時刻</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="duration" render={({ field }) => (
          <FormItem>
            <FormLabel>所要時間（分）</FormLabel>
            <FormControl><Input type="number" min={1} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '追加中...' : '食事場所を追加'}
        </Button>
      </form>
    </Form>
  );
}
