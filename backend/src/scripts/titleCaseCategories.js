import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/Category.js';

// Load environment variables from backend/.env
dotenv.config();

// Convert a string to Title Case: first letter of each word uppercase, rest lowercase.
// Diacritic-aware (ā, ṇ, ś, ḍ, etc.) because JS (toUpperCase/toLowerCase) handles Unicode.
const toTitleCase = (str) =>
  str
    .split(/(\s+)/) // keep separators (spaces) intact
    .map((part) => {
      if (/^\s+$/.test(part) || part.length === 0) return part;
      return part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase();
    })
    .join('');

// A name is "all caps" if it has letters and equals its own uppercased form.
const isAllCaps = (str) => {
  if (!str) return false;
  const hasLetters = str.toLocaleLowerCase() !== str.toLocaleUpperCase();
  return hasLetters && str === str.toLocaleUpperCase();
};

const run = async () => {
  const apply = process.argv.includes('--apply');

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`📦 Connected to MongoDB (${apply ? 'APPLY' : 'DRY RUN'} mode)\n`);

  const categories = await Category.find({}, { name: 1 }).lean();

  const changes = categories
    .filter((c) => isAllCaps(c.name))
    .map((c) => ({ _id: c._id, from: c.name, to: toTitleCase(c.name) }))
    .filter((c) => c.from !== c.to);

  if (changes.length === 0) {
    console.log('No all-caps categories found. Nothing to change.');
  } else {
    console.log(`Found ${changes.length} all-caps categories:\n`);
    changes.forEach((c) => console.log(`  "${c.from}"  ->  "${c.to}"`));
    console.log('');

    if (apply) {
      for (const c of changes) {
        await Category.updateOne({ _id: c._id }, { $set: { name: c.to } });
      }
      console.log(`✅ Updated ${changes.length} categories.`);
    } else {
      console.log('Dry run only. Re-run with --apply to save these changes.');
    }
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
