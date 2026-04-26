import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Book from '../models/Book.js';

// Load environment variables
dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Drop existing collections to remove any problematic indexes
    try {
      await mongoose.connection.db.dropCollection('users');
      console.log('Dropped users collection...');
    } catch (error) {
      // Collection might not exist, ignore error
    }
    
    try {
      await mongoose.connection.db.dropCollection('books');
      console.log('Dropped books collection...');
    } catch (error) {
      // Collection might not exist, ignore error
    }
    
    console.log('Cleared existing data...');

    // Create admin user
    const adminPassword = await bcryptjs.hash(process.env.ADMIN_PASSWORD || 'SecureAdminPass123!', 12);
    
    const adminUser = await User.create({
      username: 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@vedicebooks.com',
      password: 'SecureAdminPass123!', // Will be hashed by pre-save middleware
      role: 'admin',
      profile: {
        firstName: 'System',
        lastName: 'Administrator',
        preferences: {
          defaultLanguage: 'english',
          theme: 'light',
          booksPerPage: 12
        }
      },
      isActive: true,
      emailVerified: true
    });

    console.log('✅ Created admin user:', adminUser.email);

    // Create test users
    const testUsers = [
      {
        username: 'testuser1',
        email: 'user1@example.com',
        password: 'TestPass123!',
        role: 'user',
        profile: {
          firstName: 'Test',
          lastName: 'User One',
          preferences: {
            defaultLanguage: 'english',
            theme: 'light'
          }
        },
        isActive: true,
        emailVerified: true
      },
      {
        username: 'testuser2',
        email: 'user2@example.com',
        password: 'TestPass123!',
        role: 'user',
        profile: {
          firstName: 'Test',
          lastName: 'User Two',
          preferences: {
            defaultLanguage: 'telugu',
            theme: 'dark'
          }
        },
        isActive: true,
        emailVerified: true
      }
    ];

    const createdUsers = await User.create(testUsers);
    console.log('✅ Created test users:', createdUsers.length);

    // Sample books data (without actual files for now)
    const sampleBooks = [
      {
        title: 'Śrī Caitanya-bhāgavata Ādi-līlā',
        author: 'Srila Vrindavana Dasa Thakura',
        description: 'Śrī Caitanya-bhāgavata is a hagiography of Caitanya Mahāprabhu written by Vrindavana Dasa Thakura. It was the first full-length work regarding Chaitanya Mahaprabhu written in Bengali language and documents his early life and role as the founder of the Gaudiya Vaishnava tradition.',
        language: 'english',
        category: 'Acaryas',
        tags: ['english', 'caitanya', 'biography'],
        fileInfo: {
          gridfsId: new mongoose.Types.ObjectId(),
          originalName: 'CB_Adi.docx',
          filename: '1763044258478_CB_Adi.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileSize: 1486000,
          fileExtension: '.docx'
        },
        metadata: {
          totalPages: 200,
          publisher: 'ISKCON Publications',
          edition: 'First Edition'
        },
        uploadInfo: {
          uploadedBy: adminUser._id,
          uploadDate: new Date('2025-11-13T14:31:02.063Z')
        },
        accessControl: {
          isPublic: true,
          accessLevel: 'public'
        }
      },
      {
        title: 'Śrī Caitanya-bhāgavata Madhya-līlā',
        author: 'Srila Vrindavana Dasa Thakura',
        description: 'The middle section of Śrī Caitanya-bhāgavata, documenting the middle period of Lord Caitanya\'s pastimes.',
        language: 'english',
        category: 'Acaryas',
        tags: ['english', 'caitanya', 'biography'],
        fileInfo: {
          gridfsId: new mongoose.Types.ObjectId(),
          originalName: 'CB_Madhya.docx',
          filename: '1763044368523_CB_Madhya.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileSize: 1920000,
          fileExtension: '.docx'
        },
        metadata: {
          totalPages: 250,
          publisher: 'ISKCON Publications',
          edition: 'First Edition'
        },
        uploadInfo: {
          uploadedBy: adminUser._id,
          uploadDate: new Date('2025-11-13T14:32:53.542Z')
        },
        accessControl: {
          isPublic: true,
          accessLevel: 'public'
        }
      },
      {
        title: 'శ్రీ గీత గోవిందం',
        author: 'జయదేవ గోస్వామి',
        description: 'Gita Govindam is a work composed by the 12th-century Hindu poet, Jayadeva. It describes the relationship between Krishna and the gopis of Vrindavana, and in particular one gopi named Radha.',
        language: 'telugu',
        category: 'Great Vaishnavas',
        tags: ['telugu', 'jayadeva', 'poetry', 'krishna'],
        fileInfo: {
          gridfsId: new mongoose.Types.ObjectId(),
          originalName: 'Sri_Gita_Govindam.pdf',
          filename: 'sample_telugu_book.pdf',
          mimeType: 'application/pdf',
          fileSize: 838860,
          fileExtension: '.pdf'
        },
        metadata: {
          totalPages: 120,
          publisher: 'Telugu Publications',
          edition: 'Second Edition'
        },
        uploadInfo: {
          uploadedBy: adminUser._id,
          uploadDate: new Date('2025-11-13T15:00:00.000Z')
        },
        accessControl: {
          isPublic: true,
          accessLevel: 'public'
        }
      },
      {
        title: 'श्रीमद्भागवतम्',
        author: 'वेदव्यास',
        description: 'The Srimad-Bhagavatam is one of the eighteen major Puranas composed in Sanskrit. It is considered the most important of the Puranas and contains twelve cantos that narrate the story of various avatars of Vishnu.',
        language: 'sanskrit',
        category: 'Sastras',
        tags: ['sanskrit', 'vedvyasa', 'purana', 'vishnu'],
        fileInfo: {
          gridfsId: new mongoose.Types.ObjectId(),
          originalName: 'Srimad_Bhagavatam.pdf',
          filename: 'sample_sanskrit_book.pdf',
          mimeType: 'application/pdf',
          fileSize: 2201000,
          fileExtension: '.pdf'
        },
        metadata: {
          totalPages: 500,
          publisher: 'Sanskrit Publications',
          edition: 'Traditional Edition'
        },
        uploadInfo: {
          uploadedBy: adminUser._id,
          uploadDate: new Date('2025-11-13T15:00:00.000Z')
        },
        accessControl: {
          isPublic: true,
          accessLevel: 'public'
        }
      },
      {
        title: 'Śrī Caitanya-bhāgavata Antya-līlā',
        author: 'Srila Vrindavana Dasa Thakura',
        description: 'The final section of Śrī Caitanya-bhāgavata, documenting the later pastimes and teachings of Lord Caitanya Mahaprabhu.',
        language: 'english',
        category: 'Acaryas',
        tags: ['english', 'caitanya', 'biography'],
        fileInfo: {
          gridfsId: new mongoose.Types.ObjectId(),
          originalName: 'CB_Antya.docx',
          filename: '1763044454235_CB_Antya.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileSize: 1650000,
          fileExtension: '.docx'
        },
        metadata: {
          totalPages: 180,
          publisher: 'ISKCON Publications',
          edition: 'First Edition'
        },
        uploadInfo: {
          uploadedBy: adminUser._id,
          uploadDate: new Date('2025-11-13T14:35:00.000Z')
        },
        accessControl: {
          isPublic: true,
          accessLevel: 'public'
        }
      }
    ];

    const createdBooks = await Book.create(sampleBooks);
    console.log('✅ Created sample books:', createdBooks.length);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📚 Sample Data Created:');
    console.log(`- Admin User: ${adminUser.email} (password: ${process.env.ADMIN_PASSWORD || 'SecureAdminPass123!'})`);
    console.log(`- Test Users: ${createdUsers.length}`);
    console.log(`- Sample Books: ${createdBooks.length}`);
    console.log('\n🔑 Login Credentials:');
    console.log(`Admin: ${adminUser.email} / ${process.env.ADMIN_PASSWORD || 'SecureAdminPass123!'}`);
    console.log('Test User: user1@example.com / TestPass123!');
    console.log('Test User: user2@example.com / TestPass123!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  }
};

// Run the seed script
seedData();