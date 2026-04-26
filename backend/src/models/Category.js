import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  translations: { type: Object, default: {} },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  type: { type: String, enum: ['category', 'book-list'], default: 'category' },
  books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
  description: { type: String },
});

export default mongoose.model('Category', CategorySchema);
