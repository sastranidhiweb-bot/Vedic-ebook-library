#!/usr/bin/env node

// Performance testing script for the content cache implementation

import fetch from 'node-fetch';
import chalk from 'chalk';

const API_BASE = 'http://localhost:5000/api';
const TEST_BOOK_ID = '674e6f5e9df46ead1f24dcdb'; // Replace with a valid book ID

async function performanceTest() {
  console.log(chalk.blue('🚀 Starting Content Cache Performance Test\n'));

  try {
    // Step 1: Test first load (should cache the content)
    console.log(chalk.yellow('📖 Test 1: First load (caching content)...'));
    const start1 = Date.now();
    
    const response1 = await fetch(`${API_BASE}/books/${TEST_BOOK_ID}/text?format=html&page=1`);
    const data1 = await response1.json();
    
    const time1 = Date.now() - start1;
    console.log(chalk.green(`✅ First load completed in ${time1}ms`));
    
    if (data1.success) {
      console.log(chalk.blue(`📄 Content length: ${data1.data.content.length} characters`));
      console.log(chalk.blue(`📖 Total pages: ${data1.data.totalPages}`));
    }

    // Step 2: Test multiple page loads (should be fast from cache)
    console.log(chalk.yellow('\n📚 Test 2: Multiple page loads from cache...'));
    
    const pagesToTest = [1, 2, 3, 4, 5];
    const times = [];
    
    for (const page of pagesToTest) {
      const start = Date.now();
      const response = await fetch(`${API_BASE}/books/${TEST_BOOK_ID}/text?format=html&page=${page}`);
      const data = await response.json();
      const time = Date.now() - start;
      
      times.push(time);
      
      if (data.success) {
        console.log(chalk.green(`✅ Page ${page}: ${time}ms (${data.data.content.length} chars)`));
      } else {
        console.log(chalk.red(`❌ Page ${page}: Error - ${data.message}`));
      }
    }
    
    const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    console.log(chalk.blue(`\n📊 Average page load time: ${avgTime}ms`));
    console.log(chalk.blue(`📊 Fastest: ${Math.min(...times)}ms, Slowest: ${Math.max(...times)}ms`));

    // Step 3: Test cache statistics
    console.log(chalk.yellow('\n📈 Test 3: Cache statistics...'));
    try {
      // Note: This requires admin authentication in a real setup
      const statsResponse = await fetch(`${API_BASE}/books/cache/stats`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log(chalk.green('✅ Cache stats:'));
        console.log(chalk.blue(`   - Entries: ${statsData.data.cache.totalEntries}`));
        console.log(chalk.blue(`   - Total size: ${statsData.data.cache.totalContentSizeMB}MB`));
        console.log(chalk.blue(`   - Memory usage: ${Math.round(statsData.data.memoryUsage.heapUsed / 1024 / 1024)}MB`));
      } else {
        console.log(chalk.yellow('⚠️ Cache stats require admin authentication'));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️ Cache stats endpoint not accessible'));
    }

    console.log(chalk.green('\n🎉 Performance test completed successfully!'));
    
    // Performance summary
    console.log(chalk.magenta('\n📋 Performance Summary:'));
    console.log(chalk.white(`• First load (with caching): ${time1}ms`));
    console.log(chalk.white(`• Average subsequent loads: ${avgTime}ms`));
    console.log(chalk.white(`• Performance improvement: ${Math.round((time1 - avgTime) / time1 * 100)}%`));
    
    if (avgTime < 100) {
      console.log(chalk.green('🚀 Excellent performance! Cache is working optimally.'));
    } else if (avgTime < 500) {
      console.log(chalk.yellow('👍 Good performance. Cache is working well.'));
    } else {
      console.log(chalk.red('⚠️ Slower than expected. Check cache implementation.'));
    }

  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message);
    console.log(chalk.yellow('\nTroubleshooting tips:'));
    console.log(chalk.white('• Make sure the backend server is running on port 5000'));
    console.log(chalk.white('• Verify the TEST_BOOK_ID exists in your database'));
    console.log(chalk.white('• Check if the book file exists in the uploads folder'));
  }
}

// Usage information
function printUsage() {
  console.log(chalk.cyan('📖 Content Cache Performance Test'));
  console.log(chalk.white('\nUsage:'));
  console.log(chalk.white('  node cache-performance-test.js'));
  console.log(chalk.white('\nBefore running:'));
  console.log(chalk.white('1. Update TEST_BOOK_ID with a valid book ID from your database'));
  console.log(chalk.white('2. Ensure the backend server is running'));
  console.log(chalk.white('3. Have at least one book uploaded\n'));
}

// Check if this is being run directly
if (process.argv[1].endsWith('cache-performance-test.js')) {
  printUsage();
  performanceTest().catch(console.error);
}

export { performanceTest };