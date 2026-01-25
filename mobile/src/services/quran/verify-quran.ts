// DEPRECATED: This test file uses the old text-based matching
// import { QuranMatchingService } from './QuranMatchingService';

async function test() {
  console.log('This test is disabled - using AI-based matching now');
  return;
  /*
  console.log('Initializing service...');
  const service = QuranMatchingService.getInstance();
  const serviceAny = service as any;

  const query = 'الحمد لله رب العالمين';
  // console.log(`Query: ${query}`); // Skipping potential mojibake print
  const normalizedQuery = service.normalizeText(query);
  // console.log(`Normalized Query: ${normalizedQuery}`);
  console.log(
    `Normalized Query CharCodes: ${normalizedQuery
      .split('')
      .map(c => c.charCodeAt(0))
      .join(',')}`
  );

  // Check Surah 1 Verse 2 specifically
  const fatiha2 = serviceAny.normalizedQuran.find(
    (x: any) => x.surah === 1 && x.ayah === 2
  );
  if (fatiha2) {
    // console.log(`Surah 1 Verse 2 Raw: ${fatiha2.text}`);
    console.log(
      `Fatiha 2 Normalized CharCodes: ${fatiha2.normalized
        .split('')
        .map((c: any) => c.charCodeAt(0))
        .join(',')}`
    );

    const score = serviceAny.calculateSimilarity(
      normalizedQuery,
      fatiha2.normalized
    );
    console.log(`Score with Fatiha 2: ${score}`);
  }

  // Check the False Positive (Surah 2 Verse 1)
  const s2v1 = serviceAny.normalizedQuran.find(
    (x: any) => x.surah === 2 && x.ayah === 1
  );
  if (s2v1) {
    console.log(
      `S2V1 Normalized CharCodes: ${s2v1.normalized
        .split('')
        .map((c: any) => c.charCodeAt(0))
        .join(',')}`
    );
    const score = serviceAny.calculateSimilarity(
      normalizedQuery,
      s2v1.normalized
    );
    console.log(`Score with S2V1: ${score}`);
  }
  */
}

test();
