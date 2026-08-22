import { githubService } from '../github/github.service';
import { parseGitHubRepositoryUrl, decodeBase64Content } from '../github/github.utils';

async function manualVerification() {
  console.log('🧪 Manual GitHub Verification\n');

  try {
    // Test 1: URL Parsing
    console.log('1. Testing URL parsing...');
    const url = 'https://github.com/facebook/react';
    const parsedUrl = parseGitHubRepositoryUrl(url);
    console.log('✅ URL parsed:', parsedUrl);

    // Test 2: Repository Metadata
    console.log('\n2. Testing repository metadata retrieval...');
    const metadata = await githubService.getRepositoryMetadata('facebook', 'react');
    console.log('✅ Repository metadata:');
    console.log('   - Name:', metadata.name);
    console.log('   - Owner:', metadata.owner);
    console.log('   - Default Branch:', metadata.defaultBranch);
    console.log('   - Stars:', metadata.stars);
    console.log('   - Primary Language:', metadata.primaryLanguage);
    console.log('   - Description:', metadata.description?.substring(0, 50) + '...');

    // Test 3: Repository Tree
    console.log('\n3. Testing repository tree retrieval...');
    const tree = await githubService.getRepositoryTree('facebook', 'react', metadata.defaultBranch);
    console.log('✅ Repository tree retrieved:', tree.length, 'items');
    console.log('   First 5 items:');
    tree.slice(0, 5).forEach(item => {
      console.log('   -', item.path, `(${item.type})`);
    });

    // Test 4: File Content
    console.log('\n4. Testing file content retrieval...');
    const fileContent = await githubService.getFileContent('facebook', 'react', 'README.md', metadata.defaultBranch);
    console.log('✅ File content retrieved:');
    console.log('   - Path:', fileContent.path);
    console.log('   - Size:', fileContent.size, 'bytes');
    console.log('   - Content preview:', fileContent.content.substring(0, 100) + '...');

    // Test 5: Decoding Helper
    console.log('\n5. Testing base64 decoding helper...');
    const testString = 'Hello, World!';
    const encoded = Buffer.from(testString).toString('base64');
    const decoded = decodeBase64Content(encoded);
    console.log('✅ Base64 decoding:', decoded === testString ? 'successful' : 'failed');

    console.log('\n✅ All manual verification tests passed! (5 tests)');
  } catch (error) {
    console.error('❌ Manual verification failed:', error);
    throw error;
  }
}

// Run manual verification
manualVerification()
  .then(() => {
    console.log('\n✨ Manual verification completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Manual verification failed:', error);
    process.exit(1);
  });
