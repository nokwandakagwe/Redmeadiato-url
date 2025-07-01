require('dotenv').config();
const config = require('../../config');
const { 
    S3Client, 
    PutObjectCommand, 
    HeadObjectCommand, 
    DeleteObjectCommand 
} = require('@aws-sdk/client-s3');

// Configure R2 Client
const r2 = new S3Client({
  region: config.cfRegion,
  endpoint: config.cfApiEndpoint,
  credentials: {
    accessKeyId: config.cfAccessKeyId,
    secretAccessKey: config.cfSecretAccessKey
  }
});

// Bucket Configuration
const BUCKET_NAME = config.cfBucketName;
const BUCKET_DOMAIN = config.cfBucketDomain;

// Parse MIME types from strings to arrays
function parseMimeTypes(mimeString) {
  try {
    return JSON.parse(mimeString.replace(/'/g, '"'));
  } catch (e) {
    console.error('Error parsing MIME types:', e);
    return [];
  }
}

// Content Type to Folder Mapping
const FOLDER_MAP = {
  image: parseMimeTypes(config.imageMimetypes),
  video: parseMimeTypes(config.videoMimetypes),
  audio: parseMimeTypes(config.audioMimetypes),
  file: parseMimeTypes(config.docMimetypes)
};

// Format file size (546.03 kB)
function formatFileSize(bytes) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'kB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format date (May 17, 2025 1:49 PM)
function formatDate(date) {
  return new Date(date).toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: 'numeric',
    hour12: true 
  });
}

// Determine folder based on content type
function getFolderForContentType(contentType) {
  if (!contentType) return 'file';
  contentType = contentType.toLowerCase();
  for (const [folder, types] of Object.entries(FOLDER_MAP)) {
    if (types.some(t => t.toLowerCase() === contentType)) {
      return folder;
    }
  }
  return 'file';
}

// Get file metadata
async function getFileMetadata(filePath) {
  if (!filePath.includes('/')) {
    throw new Error('File path must include folder (e.g. "image/filename.jpg")');
  }

  try {
    const headResponse = await r2.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filePath
    }));

    return {
      size: formatFileSize(headResponse.ContentLength),
      mimetype: headResponse.ContentType,
      storageClass: headResponse.StorageClass || 'Standard',
      expiry: 'No Expiry Unless Deleted',
      name: filePath.split('/').pop(),
      path: filePath,
      modified: formatDate(headResponse.LastModified),
      url: `https://${BUCKET_DOMAIN}/${filePath}`
    };
  } catch (error) {
    console.error('Metadata fetch error:', error);
    throw new Error('File not found or access denied');
  }
}

// Upload file with folder organization
async function uploadFile(originalFileName, fileBuffer, contentType) {
  const folder = getFolderForContentType(contentType);
  const cleanName = originalFileName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-._]/g, '');
  const filePath = `${folder}/${cleanName}`;

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filePath,
    Body: fileBuffer,
    ContentType: contentType,
    ACL: 'public-read'
  }));

  return getFileMetadata(filePath);
}

// Get file URL and info
async function getFileUrl(filePath) {
  return getFileMetadata(filePath);
}

// Delete file
async function deleteFile(filePath) {
  const metadata = await getFileMetadata(filePath);
  await r2.send(new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filePath
  }));
  return { 
    ...metadata, 
    deleted: true, 
    deletedAt: formatDate(new Date()) 
  };
}

module.exports = { uploadFile, getFileUrl, deleteFile };
