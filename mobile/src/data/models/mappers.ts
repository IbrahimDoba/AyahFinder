/**
 * Data Mappers
 * Convert between DTOs and Domain Entities
 */
import { Surah, createSurah } from '@/domain/entities/Surah';
import { Ayah, createAyah } from '@/domain/entities/Ayah';
import { SurahDTO } from './SurahDTO';
import { AyahDTO } from './AyahDTO';

/**
 * Map SurahDTO to Surah domain entity
 */
export function mapSurahDTOToEntity(dto: SurahDTO): Surah {
  return createSurah({
    id: dto.id,
    number: dto.number,
    nameArabic: dto.name_arabic,
    nameEnglish: dto.name_english,
    nameTransliteration: dto.name_transliteration,
    revelationType: dto.revelation_type,
    ayahCount: dto.ayah_count,
  });
}

/**
 * Map array of SurahDTOs to Surah entities
 */
export function mapSurahsDTOToEntities(dtos: SurahDTO[]): Surah[] {
  return dtos.map(mapSurahDTOToEntity);
}

/**
 * Map AyahDTO to Ayah domain entity
 */
export function mapAyahDTOToEntity(dto: AyahDTO): Ayah {
  return createAyah({
    id: dto.id,
    surahId: dto.surah_id,
    surahNumber: dto.surah_number,
    ayahNumber: dto.ayah_number,
    textArabic: dto.text_arabic,
    textUthmani: dto.text_uthmani,
    juzNumber: dto.juz_number,
    pageNumber: dto.page_number,
    hizbNumber: dto.hizb_number,
    sajdaType: dto.sajda_type,
  });
}

/**
 * Map array of AyahDTOs to Ayah entities
 */
export function mapAyahsDTOToEntities(dtos: AyahDTO[]): Ayah[] {
  return dtos.map(mapAyahDTOToEntity);
}
