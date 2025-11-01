// Script to clean up duplicate grading agents
// Run this once to remove duplicates created by the bug

const mongoose = require('mongoose');

async function cleanupDuplicateAgents() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hci_grader';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const agentsCollection = db.collection('gradingagents');

    // Find all agents grouped by questionId and name
    const pipeline = [
      {
        $group: {
          _id: { questionId: '$questionId', name: '$name' },
          count: { $sum: 1 },
          agents: { $push: '$$ROOT' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ];

    const duplicates = await agentsCollection.aggregate(pipeline).toArray();

    if (duplicates.length === 0) {
      console.log('✓ No duplicate agents found!');
      await mongoose.connection.close();
      return;
    }

    console.log(`Found ${duplicates.length} sets of duplicate agents`);

    let deletedCount = 0;
    for (const group of duplicates) {
      const agents = group.agents;
      // Keep the oldest agent (first one), delete the rest
      const [keepAgent, ...duplicatesToDelete] = agents.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );

      const idsToDelete = duplicatesToDelete.map(a => a._id);
      
      console.log(`Keeping agent: ${keepAgent.name} (${keepAgent._id})`);
      console.log(`Deleting ${idsToDelete.length} duplicates`);

      const result = await agentsCollection.deleteMany({
        _id: { $in: idsToDelete }
      });

      deletedCount += result.deletedCount;
    }

    console.log(`✓ Cleanup complete! Deleted ${deletedCount} duplicate agents`);
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupDuplicateAgents();

