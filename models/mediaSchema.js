const mongoose = require('mongoose');

// Shared media descriptor for questions and question groups.
// Only a URL/reference is stored — never binary image data.
// Storage integration point: `url` may reference an external CDN/object store or a
// static path served by the app (e.g. `/uploads/questions/xyz.png`). No upload
// pipeline is introduced here; the admin API accepts a URL supplied by the caller.
const MEDIA_TYPES = ['image', 'chart', 'table'];

const mediaSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: MEDIA_TYPES,
      default: 'image',
    },
    url: {
      type: String,
      default: '',
      trim: true,
    },
    alt: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

module.exports = { mediaSchema, MEDIA_TYPES };
