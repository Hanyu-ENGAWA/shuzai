'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { LocationForm } from '@/components/forms/LocationForm';
import { AccommodationForm } from '@/components/forms/AccommodationForm';
import { MealForm } from '@/components/forms/MealForm';
import { RestStopForm } from '@/components/forms/RestStopForm';
import { useProjectStore } from '@/stores/projectStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, MapPin, Hotel, UtensilsCrossed, Coffee, Trash2 } from 'lucide-react';

export default function LocationsPage() {
  const { id } = useParams<{ id: string }>();
  const {
    currentProject,
    fetchProject,
    addLocation,
    addAccommodation,
    addMeal,
    addRestStop,
    isLoading,
  } = useProjectStore();

  const [loadingForm, setLoadingForm] = useState<string | null>(null);

  useEffect(() => {
    fetchProject(id);
  }, [id, fetchProject]);

  const handleAddLocation = async (data: Parameters<typeof addLocation>[1]) => {
    setLoadingForm('location');
    const result = await addLocation(id, data);
    if (result) toast.success('撮影地を追加しました');
    else toast.error('追加に失敗しました');
    setLoadingForm(null);
  };

  const handleAddAccommodation = async (data: Parameters<typeof addAccommodation>[1]) => {
    setLoadingForm('accommodation');
    const result = await addAccommodation(id, data);
    if (result) toast.success('宿泊地を追加しました');
    else toast.error('追加に失敗しました');
    setLoadingForm(null);
  };

  const handleAddMeal = async (data: Parameters<typeof addMeal>[1]) => {
    setLoadingForm('meal');
    const result = await addMeal(id, data);
    if (result) toast.success('食事場所を追加しました');
    else toast.error('追加に失敗しました');
    setLoadingForm(null);
  };

  const handleAddRestStop = async (data: Parameters<typeof addRestStop>[1]) => {
    setLoadingForm('restStop');
    const result = await addRestStop(id, data);
    if (result) toast.success('休憩地点を追加しました');
    else toast.error('追加に失敗しました');
    setLoadingForm(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-8 text-center text-muted-foreground">
          読み込み中...
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              ダッシュボードへ戻る
            </Link>
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{currentProject?.title ?? 'プロジェクト'}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                撮影地・宿泊・食事・休憩の入力
              </p>
            </div>
            <Button asChild>
              <Link href={`/projects/${id}/schedule`}>
                工程表を生成 <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 入力フォーム */}
          <div>
            <Tabs defaultValue="locations">
              <TabsList className="w-full">
                <TabsTrigger value="locations" className="flex-1">
                  <MapPin className="h-4 w-4 mr-1" />撮影地
                </TabsTrigger>
                <TabsTrigger value="accommodations" className="flex-1">
                  <Hotel className="h-4 w-4 mr-1" />宿泊
                </TabsTrigger>
                <TabsTrigger value="meals" className="flex-1">
                  <UtensilsCrossed className="h-4 w-4 mr-1" />食事
                </TabsTrigger>
                <TabsTrigger value="rest-stops" className="flex-1">
                  <Coffee className="h-4 w-4 mr-1" />休憩
                </TabsTrigger>
              </TabsList>

              <TabsContent value="locations">
                <Card>
                  <CardHeader><CardTitle className="text-base">撮影地を追加</CardTitle></CardHeader>
                  <CardContent>
                    <LocationForm onSubmit={handleAddLocation} isLoading={loadingForm === 'location'} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="accommodations">
                <Card>
                  <CardHeader><CardTitle className="text-base">宿泊地を追加</CardTitle></CardHeader>
                  <CardContent>
                    <AccommodationForm onSubmit={handleAddAccommodation} isLoading={loadingForm === 'accommodation'} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="meals">
                <Card>
                  <CardHeader><CardTitle className="text-base">食事場所を追加</CardTitle></CardHeader>
                  <CardContent>
                    <MealForm onSubmit={handleAddMeal} isLoading={loadingForm === 'meal'} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rest-stops">
                <Card>
                  <CardHeader><CardTitle className="text-base">休憩地点を追加</CardTitle></CardHeader>
                  <CardContent>
                    <RestStopForm onSubmit={handleAddRestStop} isLoading={loadingForm === 'restStop'} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* 登録済みリスト */}
          <div className="space-y-4">
            {/* 撮影地リスト */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  撮影地 ({currentProject?.locations.length ?? 0}件)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentProject?.locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">まだ登録されていません</p>
                ) : (
                  <ul className="space-y-2">
                    {currentProject?.locations.map((loc) => (
                      <li key={loc.id} className="flex items-start justify-between gap-2 p-2 rounded border">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{loc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            撮影: {loc.shootingDuration}分
                            {loc.bufferBefore > 0 && ` / 前: ${loc.bufferBefore}分`}
                            {loc.bufferAfter > 0 && ` / 後: ${loc.bufferAfter}分`}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* 宿泊地リスト */}
            {(currentProject?.accommodations.length ?? 0) > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hotel className="h-4 w-4" />
                    宿泊地 ({currentProject?.accommodations.length}件)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {currentProject?.accommodations.map((acc) => (
                      <li key={acc.id} className="p-2 rounded border">
                        <p className="font-medium text-sm">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {acc.checkInDate && `${acc.checkInDate} チェックイン`}
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 食事リスト */}
            {(currentProject?.meals.length ?? 0) > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4" />
                    食事 ({currentProject?.meals.length}件)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {currentProject?.meals.map((meal) => (
                      <li key={meal.id} className="flex items-center gap-2 p-2 rounded border">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {meal.mealType === 'breakfast' ? '朝' : meal.mealType === 'lunch' ? '昼' : '夕'}
                        </Badge>
                        <p className="font-medium text-sm">{meal.name}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
