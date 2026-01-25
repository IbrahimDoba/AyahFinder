/**
 * Surah (Chapter) Domain Entity
 * Pure business logic, no external dependencies
 */
export interface Surah {
  id: number;
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTransliteration: string;
  revelationType: 'meccan' | 'medinan';
  ayahCount: number;
}

export function createSurah(data: Partial<Surah> & Pick<Surah, 'number' | 'nameArabic'>): Surah {
  return {
    id: data.id ?? data.number,
    number: data.number,
    nameArabic: data.nameArabic,
    nameEnglish: data.nameEnglish ?? '',
    nameTransliteration: data.nameTransliteration ?? '',
    revelationType: data.revelationType ?? 'meccan',
    ayahCount: data.ayahCount ?? 0,
  };
}
