'use strict';

// Isolated Build 10 reference implementation. NOT wired into the deployed Edge Function.
// Callers must serialize replacements for each (partnerKind, partnerId, docType).
async function replaceKycDocument({ storage, documents, key, bytes, contentType, fileName, path }) {
  if (!key || !path || !bytes) throw new Error('invalid_kyc_replacement');
  const previous = await documents.find(key);
  if (previous && previous.storage_path === path) throw new Error('path_must_be_unique');
  const upload = await storage.upload(path, bytes, { contentType, upsert: false });
  if (upload.error) throw new Error('kyc_storage_upload_failed');
  try {
    const saved = await documents.upsert({ ...key, storage_path: path, file_name: fileName, content_type: contentType, size_bytes: bytes.length });
    if (saved.error || !saved.data || saved.data.storage_path !== path) throw new Error('kyc_persistence_failed');
    // Cleanup failure is nonfatal: the new record must remain valid.
    if (previous?.storage_path) {
      try { await storage.remove([previous.storage_path]); } catch (_) {}
    }
    return saved.data;
  } catch (error) {
    // Do not delete previous record/file. Clean only newly uploaded orphan.
    try { await storage.remove([path]); } catch (_) {}
    throw error;
  }
}
module.exports = { replaceKycDocument };
