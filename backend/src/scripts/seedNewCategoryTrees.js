import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/Category.js';

// Load environment variables from backend/.env
dotenv.config();

// Two category trees to add. Leaf nodes (where books get linked) use
// type 'book-list'; branch/root nodes use type 'category'.
const trees = [
  {
    name: 'Vaishnava Manjusha',
    type: 'category',
    children: [
      {
        name: 'Parampara',
        type: 'category',
        children: [
          { name: 'Śrī Sampradāya', type: 'book-list' },
          { name: 'Mādhava Sampradāya', type: 'book-list' },
          { name: 'Rudra Sampradāya', type: 'book-list' },
          { name: 'Kumāra Sampradāya', type: 'book-list' },
        ],
      },
    ],
  },
  {
    name: 'Classical Literature',
    type: 'category',
    children: [
      { name: 'Sanskrit', type: 'book-list' },
      { name: 'Regional', type: 'book-list' },
    ],
  },
];

// Recursively create a node and its children, wiring up parent/children refs.
const createNode = async (node, parentId) => {
  const doc = await Category.create({
    name: node.name,
    type: node.type || 'category',
    parent: parentId || null,
    children: [],
    books: [],
    description: '',
  });

  const childIds = [];
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const childDoc = await createNode(child, doc._id);
      childIds.push(childDoc._id);
    }
  }

  if (childIds.length > 0) {
    doc.children = childIds;
    await doc.save();
  }

  return doc;
};

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('📦 Connected to MongoDB\n');

  for (const tree of trees) {
    // Idempotent: skip if a root category with this name already exists.
    const existing = await Category.findOne({ name: tree.name, parent: null });
    if (existing) {
      console.log(`⏭️  "${tree.name}" already exists. Skipping.`);
      continue;
    }
    await createNode(tree, null);
    console.log(`✅ Inserted tree "${tree.name}".`);
  }

  await mongoose.disconnect();
  console.log('\n🎉 Done.');
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
