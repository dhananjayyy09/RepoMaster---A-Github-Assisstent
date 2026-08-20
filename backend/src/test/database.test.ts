import prisma from '../config/database';
import { userService } from '../services/user.service';
import { repositoryService } from '../services/repository.service';
import { repositoryFileService } from '../services/repositoryFile.service';
import { indexingJobService } from '../services/indexingJob.service';
import { chatService } from '../services/chat.service';

async function testDatabaseOperations() {
  console.log('🧪 Testing Database Operations...\n');

  try {
    // Test 1: Create User
    console.log('1. Creating user...');
    const timestamp = Date.now();
    const user = await userService.createUser(`test${timestamp}@example.com`);
    console.log('✅ User created:', user.id, user.email);

    // Test 2: Get User
    console.log('\n2. Getting user by ID...');
    const foundUser = await userService.getUserById(user.id);
    console.log('✅ User found:', foundUser.email);

    // Test 3: Create Repository
    console.log('\n3. Creating repository...');
    const repository = await repositoryService.createRepository({
      userId: user.id,
      githubOwner: 'testowner',
      githubRepo: 'testrepo',
      githubUrl: 'https://github.com/testowner/testrepo',
      description: 'Test repository',
      stars: 10,
      forks: 5,
      primaryLanguage: 'TypeScript',
    });
    console.log('✅ Repository created:', repository.id, repository.githubOwner + '/' + repository.githubRepo);

    // Test 4: Get Repository with User
    console.log('\n4. Getting repository with relations...');
    const foundRepository = await repositoryService.getRepositoryById(repository.id);
    console.log('✅ Repository found for user:', foundRepository.userId);

    // Test 5: Create Repository File
    console.log('\n5. Creating repository file...');
    const file = await repositoryFileService.createRepositoryFile({
      repositoryId: repository.id,
      filePath: 'src/index.ts',
      fileName: 'index.ts',
      extension: '.ts',
      language: 'TypeScript',
      fileSize: 1024,
      sha: 'abc123',
    });
    console.log('✅ File created:', file.id, file.filePath);

    // Test 6: Get Files by Repository
    console.log('\n6. Getting files by repository...');
    const files = await repositoryFileService.getFilesByRepository(repository.id);
    console.log('✅ Files found:', files.length);

    // Test 7: Create Indexing Job
    console.log('\n7. Creating indexing job...');
    const job = await indexingJobService.createIndexingJob(repository.id);
    console.log('✅ Job created:', job.id, job.status);

    // Test 8: Update Job Status
    console.log('\n8. Updating job status...');
    const updatedJob = await indexingJobService.startJob(job.id);
    console.log('✅ Job status updated:', updatedJob.status);

    // Test 9: Create Chat Session
    console.log('\n9. Creating chat session...');
    const chatSession = await chatService.createChatSession({
      userId: user.id,
      repositoryId: repository.id,
      title: 'Test Chat',
    });
    console.log('✅ Chat session created:', chatSession.id);

    // Test 10: Create Message
    console.log('\n10. Creating message...');
    const message = await chatService.createMessage({
      chatSessionId: chatSession.id,
      role: 'USER',
      content: 'Hello, how does authentication work?',
    });
    console.log('✅ Message created:', message.id, message.role);

    // Test 11: Get Chat Session with Messages
    console.log('\n11. Getting chat session with messages...');
    const foundChatSession = await chatService.getChatSessionById(chatSession.id);
    console.log('✅ Chat session found:', foundChatSession.id);

    // Test 12: Test Relationships
    console.log('\n12. Testing relationships...');
    const userRepositories = await repositoryService.getRepositoriesByUser(user.id);
    console.log('✅ User has repositories:', userRepositories.length);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await chatService.deleteChatSession(chatSession.id);
    await indexingJobService.deleteIndexingJob(job.id);
    await repositoryFileService.deleteFilesByRepository(repository.id);
    await repositoryService.deleteRepository(repository.id);
    await userService.deleteUser(user.id);
    console.log('✅ Cleanup complete');

    console.log('\n✅ All database operations tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testDatabaseOperations()
    .then(() => {
      console.log('\n✨ Tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Tests failed:', error);
      process.exit(1);
    });
}

export { testDatabaseOperations };
