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
    // Read back persisted state before deleting the previous object. A successful
    // upsert response alone does not prove the record is durable.
    const confirmed = await documents.find(key);
    if (!confirmed || confirmed.storage_path !== path) {
      // Upsert may have committed despite stale/failed readback. Retain both
      // objects for reconciliation rather than risk deleting the active file.
      throw Object.assign(new Error('kyc_persistence_unconfirmed'), { preserveNewUpload: true });
    }
    // Cleanup failure is nonfatal: the new record must remain valid.
    if (previous?.storage_path) {
      try { await storage.remove([previous.storage_path]); } catch (_) {}
    }
    return saved.data;
  } catch (error) {
    // Do not delete previous record/file. Clean only newly uploaded orphan.
    if (!error.preserveNewUpload) {
      try { await storage.remove([path]); } catch (_) {}
    }
    throw error;
  }
}
module.exports = { replaceKycDocument };
