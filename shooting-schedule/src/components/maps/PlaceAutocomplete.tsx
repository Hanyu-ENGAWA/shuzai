'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface PlaceSuggestion {
  place_id: string;
  description: string;
}

interface PlaceDetails {
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  place_id: string;
}

interface Props {
  value?: string;
  onSelect: (details: { name: string; address: string; lat: number; lng: number; placeId: string }) => void;
  placeholder?: string;
}

export function PlaceAutocomplete({ value, onSelect, placeholder = '場所を検索...' }: Props) {
  const [inputValue, setInputValue] = useState(value ?? '');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (input: string) => {
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/maps/autocomplete?input=${encodeURIComponent(input)}`);
      const json = await res.json() as { success: boolean; data?: { predictions: PlaceSuggestion[] } };
      if (json.success && json.data?.predictions) {
        setSuggestions(json.data.predictions);
        setIsOpen(true);
      }
    } catch {
      // API未設定時は無視
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 400);
  };

  const handleSelect = async (suggestion: PlaceSuggestion) => {
    setInputValue(suggestion.description);
    setIsOpen(false);
    setSuggestions([]);

    try {
      const res = await fetch(`/api/maps/place-details?placeId=${suggestion.place_id}`);
      const json = await res.json() as { success: boolean; data?: { result: PlaceDetails } };
      if (json.success && json.data?.result) {
        const result: PlaceDetails = json.data.result;
        onSelect({
          name: result.name,
          address: result.formatted_address,
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          placeId: result.place_id,
        });
      }
    } catch {
      // フォールバック
      onSelect({ name: suggestion.description, address: suggestion.description, lat: 0, lng: 0, placeId: suggestion.place_id });
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              className="px-3 py-2 text-sm hover:bg-muted cursor-pointer"
              onMouseDown={() => handleSelect(s)}
            >
              {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
