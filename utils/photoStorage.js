import { Directory, File, Paths } from 'expo-file-system';

const photosDir = new Directory(Paths.document, 'plant-photos');

export function savePlantPhoto(sourceUri) {
  if (!photosDir.exists) {
    photosDir.create({ intermediates: true });
  }

  const source = new File(sourceUri);
  const extension = source.uri.split('.').pop().split('?')[0] || 'jpg';
  const dest = new File(photosDir, `${Date.now()}.${extension}`);
  source.copy(dest);
  return dest.uri;
}
