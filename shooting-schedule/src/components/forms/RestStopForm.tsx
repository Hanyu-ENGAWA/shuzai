'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlaceAutocomplete } from '@/components/maps/PlaceAutocomplete';

const schema = z.object({
  name: z.string().min(1, '場所名は必須です'),
  address: z.string().optional(),
  placeId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  duration: z.coerce.number().int().min(1).default(15),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (data: FormValues) => Promise<void>;
  isLoading?: boolean;
}

export function RestStopForm({ onSubmit, isLoading }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      address: '',
      duration: 15,
      notes: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <FormLabel className="text-sm font-medium">休憩場所を検索</FormLabel>
          <div className="mt-1">
            <PlaceAutocomplete
              onSelect={(d) => {
                form.setValue('name', d.name);
                form.setValue('address', d.address);
                form.setValue('lat', d.lat);
                form.setValue('lng', d.lng);
                form.setValue('placeId', d.placeId);
              }}
              placeholder="場所を検索..."
            />
          </div>
        </div>

        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>場所名 *</FormLabel>
            <FormControl><Input {...field} placeholder="例: コンビニ、道の駅" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="duration" render={({ field }) => (
          <FormItem>
            <FormLabel>休憩時間（分）</FormLabel>
            <FormControl><Input type="number" min={1} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>備考</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '追加中...' : '休憩地点を追加'}
        </Button>
      </form>
    </Form>
  );
}
