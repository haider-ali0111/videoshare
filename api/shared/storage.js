const {
  StorageSharedKeyCredential,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions
} = require('@azure/storage-blob');
const { v4: uuid } = require('uuid');

const accountName = process.env.AZURE_STORAGE_ACCOUNT;
const key = process.env.AZURE_STORAGE_KEY;
const containerName = process.env.AZURE_STORAGE_CONTAINER_VIDEOS;

const sharedKey = new StorageSharedKeyCredential(accountName, key);
const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  sharedKey
);

function newBlobName(original = 'video.mp4') {
  const ext = original.includes('.') ? original.split('.').pop() : 'mp4';
  return `${uuid()}.${ext}`;
}
function getBlobUrl(blobName) {
  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}`;
}
function generateWriteSas(blobName, minutes = 15) {
  const expiresOn = new Date(Date.now() + minutes * 60 * 1000);
  const sas = generateBlobSASQueryParameters(
    { containerName, blobName, permissions: BlobSASPermissions.parse('cw'), startsOn: new Date(), expiresOn },
    sharedKey
  ).toString();
  return `${getBlobUrl(blobName)}?${sas}`;
}
function generateReadSas(blobName, minutes = 60) {
  const expiresOn = new Date(Date.now() + minutes * 60 * 1000);
  const sas = generateBlobSASQueryParameters(
    { containerName, blobName, permissions: BlobSASPermissions.parse('r'), startsOn: new Date(), expiresOn },
    sharedKey
  ).toString();
  return `${getBlobUrl(blobName)}?${sas}`;
}

module.exports = { newBlobName, generateWriteSas, generateReadSas, getBlobUrl };