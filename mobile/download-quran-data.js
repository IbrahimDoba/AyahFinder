const fs = require('fs');
const https = require('https');
const path = require('path');

const dir = path.join(__dirname, 'src', 'data', 'quran');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const files = [
  {
    url: 'https://raw.githubusercontent.com/risan/quran-json/main/dist/quran.json',
    dest: path.join(dir, 'quran-arabic.json'),
    name: 'Arabic Text',
  },
  {
    url: 'https://unpkg.com/quran-json@latest/json/translations/en.json',
    dest: path.join(dir, 'quran-english.json'),
    name: 'English Translation',
  },
];

function downloadFile(file) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${file.name} from ${file.url}...`);
    const fileStream = fs.createWriteStream(file.dest);

    const request = https.get(file.url, response => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadFile({ ...file, url: response.headers.location })
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(
          new Error(
            `Failed to download ${file.name}: Status ${response.statusCode}`
          )
        );
        return;
      }

      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Finished ${file.name}`);
        resolve();
      });
    });

    request.on('error', err => {
      fs.unlink(file.dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  try {
    await Promise.all(files.map(downloadFile));
    console.log('All downloads complete.');
  } catch (error) {
    console.error('Download failed:', error);
    process.exit(1);
  }
}

main();
