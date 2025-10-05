#!/bin/bash

echo "🔧 Fixing remaining @shared/schema imports on server..."

# Fix verify-holyloy-credentials.ts
sed -i "s|from '@shared/schema';|from '../shared/schema.js';|g" server/verify-holyloy-credentials.ts

# Fix recreate-holyloy-admins.ts  
sed -i "s|from '@shared/schema';|from '../shared/schema.js';|g" server/recreate-holyloy-admins.ts

# Fix create-admin-accounts.ts
sed -i "s|from '@shared/schema';|from '../shared/schema.js';|g" server/create-admin-accounts.ts

# Fix cleanup-admins.ts
sed -i "s|from '@shared/schema';|from '../shared/schema.js';|g" server/cleanup-admins.ts

# Fix service files
sed -i "s|from \"@shared/schema\";|from \"../../shared/schema.js\";|g" server/services/ShoppingVoucherManager.ts
sed -i "s|from \"@shared/schema\";|from \"../../shared/schema.js\";|g" server/services/DynamicRankConfigService.ts

echo "✅ Fixed all @shared/schema imports"

# Rebuild the application
echo "🏗️ Rebuilding application..."
npm run build

# Restart PM2
echo "🚀 Restarting PM2..."
pm2 restart holyloy
pm2 save

echo "✅ Server imports fixed and application restarted!"
echo "🌐 Test your website: https://holyloy.org"
