/**
 * Ayah (Verse) Domain Entity
 */
export interface Ayah {
  id: number;
  surahId: number;
  surahNumber: number;
  ayahNumber: number;
  textArabic: string;
  textUthmani?: string;
  juzNumber: number;
  pageNumber: number;
  hizbNumber?: number;
  sajdaType?: 'obligatory' | 'recommended';
}

export function createAyah(
  data: Partial<Ayah> & Pick<Ayah, 'surahId' | 'ayahNumber' | 'textArabic'>
): Ayah {
  return {
    id: data.id ?? 0,
    surahId: data.surahId,
    surahNumber: data.surahNumber ?? 0,
    ayahNumber: data.ayahNumber,
    textArabic: data.textArabic,
    textUthmani: data.textUthmani,
    juzNumber: data.juzNumber ?? 0,
    pageNumber: data.pageNumber ?? 0,
    hizbNumber: data.hizbNumber,
    sajdaType: data.sajdaType,
  };
}
