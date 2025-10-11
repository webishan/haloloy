import fs from 'fs';
import path from 'path';

// Script to remove all in-memory storage from storage.ts
async function removeInMemoryStorage() {
  try {
    console.log('🔄 Removing all in-memory storage from storage.ts...');
    
    const storagePath = path.join(__dirname, 'storage.ts');
    let content = fs.readFileSync(storagePath, 'utf8');
    
    // Remove all Map declarations
    const mapDeclarationRegex = /^\s*private\s+[a-zA-Z]+:\s*Map<[^>]+>\s*=\s*new\s+Map\(\);\s*$/gm;
    content = content.replace(mapDeclarationRegex, '');
    
    // Remove all in-memory storage operations
    const inMemoryOps = [
      // Map operations
      /this\.[a-zA-Z]+\.set\([^)]+\);/g,
      /this\.[a-zA-Z]+\.get\([^)]+\)/g,
      /this\.[a-zA-Z]+\.delete\([^)]+\)/g,
      /this\.[a-zA-Z]+\.clear\(\)/g,
      /this\.[a-zA-Z]+\.has\([^)]+\)/g,
      /this\.[a-zA-Z]+\.values\(\)/g,
      /this\.[a-zA-Z]+\.keys\(\)/g,
      /this\.[a-zA-Z]+\.entries\(\)/g,
      /Array\.from\(this\.[a-zA-Z]+\.values\(\)\)/g,
      /Array\.from\(this\.[a-zA-Z]+\.keys\(\)\)/g,
      /Array\.from\(this\.[a-zA-Z]+\.entries\(\)\)/g,
    ];
    
    inMemoryOps.forEach(regex => {
      content = content.replace(regex, '/* REMOVED: In-memory storage operation */');
    });
    
    // Write the cleaned content back
    fs.writeFileSync(storagePath, content);
    
    console.log('✅ Successfully removed in-memory storage operations');
    console.log('⚠️  Note: You may need to manually fix some methods that relied on in-memory storage');
    
  } catch (error) {
    console.error('❌ Error removing in-memory storage:', error);
  }
}

removeInMemoryStorage();
